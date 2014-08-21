(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer")
},{"base64-js":2,"buffer":1,"ieee754":3,"oMfpAn":4}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")
},{"buffer":1,"oMfpAn":4}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754")
},{"buffer":1,"oMfpAn":4}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process/browser.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process")
},{"buffer":1,"oMfpAn":4}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

/********************************************************************
 * DEFAULT NOTE TEMPLATES
 *
 * Includes four pre-loaded note templates.
 * Each template is exported to be used in settings-app to load widget.
 *
 ********************************************************************/


/* Note template that corresponds to user's site color scheme  */
exports.defaultNote = {
    "design" : {
        "template" : "defaultNote",
        "text" : {
            "color" : "color-1",
            "preset": "5",
            "alignment" : "center"
        },
        "background" : {
            "color" : "color-8",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "color-9",
            "opacity" : "1"
        },
        "border" : {
            "color" : "color-6",
            "width" : "4",
            "radius" : "0"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a spiral notepad  */
exports.spiralNote = {
    "design" : {
        "template" : "spiralNote",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(255,255,255,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(175,204,255,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#505C73",
            "width" : "0",
            "radius" : "6"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a postit note */
exports.postitNote = {
    "design" : {
        "template" : "postitNote",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(251,239,172,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(251,227,97,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#3f3a26",
            "width" : "0",
            "radius" : "3"
        }
    },
    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a chalkboard  */
exports.chalkboardNote = {
    "design" : {
        "template" : "chalkboardNote",
        "text" : {
            "color" : "#FFFFFF",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(72,104,35,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(94,141,48,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#FFFFFF",
            "width" : "8",
            "radius" : "8"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/defaultTemplates.js","/")
},{"buffer":1,"oMfpAn":4}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/elanas/Desktop/Wix Projects/rolling-notes/public/javascripts/defaultTemplates.js":[function(require,module,exports){

/********************************************************************
 * DEFAULT NOTE TEMPLATES
 *
 * Includes four pre-loaded note templates.
 * Each template is exported to be used in settings-app to load widget.
 *
 ********************************************************************/


/* Note template that corresponds to user's site color scheme  */
exports.defaultNote = {
    "design" : {
        "template" : "defaultNote",
        "text" : {
            "color" : "color-1",
            "preset": "5",
            "alignment" : "center"
        },
        "background" : {
            "color" : "color-8",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "color-9",
            "opacity" : "1"
        },
        "border" : {
            "color" : "color-6",
            "width" : "4",
            "radius" : "0"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a spiral notepad  */
exports.spiralNote = {
    "design" : {
        "template" : "spiralNote",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(255,255,255,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(175,204,255,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#505C73",
            "width" : "0",
            "radius" : "6"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a postit note */
exports.postitNote = {
    "design" : {
        "template" : "postitNote",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(251,239,172,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(251,227,97,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#3f3a26",
            "width" : "0",
            "radius" : "3"
        }
    },
    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a chalkboard  */
exports.chalkboardNote = {
    "design" : {
        "template" : "chalkboardNote",
        "text" : {
            "color" : "#FFFFFF",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(72,104,35,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(94,141,48,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#FFFFFF",
            "width" : "8",
            "radius" : "8"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};
},{}],"/Users/elanas/Desktop/Wix Projects/rolling-notes/public/javascripts/settings-app.js":[function(require,module,exports){

/********************************************************************
 * Settings UI
 *
 * Includes all functionality for settings interface.
 * Used to customize/style rolling notes widget.
 *
 * Uses Angular for model.
 * Corresponds to views/settings.ejs.
 *
 ********************************************************************/

/* Grabbing note templates */
var templates = require("./defaultTemplates");
var siteColorStyles;

(function(){

    /*
     *   Initializing angular app called 'settingsApp'.
     *   Uses two external angular libraries: ui.sortable and ngAnimate
     */
    var app = angular.module("settingsApp", ['ui.sortable','ngAnimate']);

    /* Initializing angular controller to be used in views/settings.ejs */
    app.controller('settingsController', ['$window', '$scope', '$http', '$timeout', function($window, $scope, $http, $timeout) {

        /**************************************************
         *  Design Settings (first tab of settings)
         **************************************************/

        /* Represents JSON of all settings for note-widget instance.
         * Grabbed from the database to index/routes.js to settings.ejs to here*/
        this.settings = $window.settings;

        /**
         * Takes the widget unique id and grabs only the widget component id.
         * Used when communicating from Settings to Widget.
         *
         * @param key - widget unique id
         * @returns string - represents widget component id
         */
        var parseCompId = function(key){
            return key.substring(key.indexOf(".") + 1);
        };

        /**
         * Returns app settings instance.
         * Used to properly authenticate '/updateComponent' POST request.
         *
         * @returns string - settings instance
         */
        var parseSettingsInstance = function() {
            var instance = window.location.search.substring(window.location.search.indexOf('instance') + 9, window.location.search.indexOf('&'));
            return instance;
        };

        /**
         * Updates the database and the Widget with settings changes.
         *
         * @param newSettings
         */
        $scope.updateComponent = function(newSettings) {
            /* replacing old settings JSON with updated settings */
            this.settings = newSettings;

            /* Sets settings instance to be used in POST request authentication below */
            this.settings.instance = parseSettingsInstance();

            /*
             * Sends a POST request to routes/index.js.
             * POSTs new settings data to database.
             * This is how settings updates/changes are saved.
             */
            $http.post('/updateComponent', this.settings).success(function() {
                console.log('posting');
            }).error(function(data, status, headers, config) {
                 console.log("OH NO! WE FAILED TO POST!!!!!");
                 console.log("data: " + data + "; status: " + status);
            });

            /* Triggers the widget UI to refresh with settings changes */
            Wix.Settings.triggerSettingsUpdatedEvent(settings, parseCompId(settings._id));
        };

        /**
         * Returns a pre-load JSON based on the
         * widget template name in the parameter.
         *
         * @param templateName - name of widget-template to return
         * @returns JSON representing widget template settings
         */
        var getTemplateDesign = function(templateName) {
            var template = JSON.parse(JSON.stringify(templates[templateName].design));

            /*
             * SPECIAL CASE: 'defaultNote' loads to the color scheme of the site it was added to.
             * These settings are saved in the variable 'siteColorStyles'.
             */
            if (templateName === 'defaultNote') {
                template.text.color = siteColorStyles.color;
                template.background.color = siteColorStyles['background-color'];
                template.border.color = siteColorStyles['border-color'];
                template.hover.color = siteColorStyles.hover;
            }
            return template;
        };

        /**
         * Sets Settings UI to template specifications.
         * Uses Wix.UI with wix-model to change Settings components.
         *
         * Example:
         *      Wix.UI.set('wix-model-name', {key, value});
         *      'wix-model-name': set in settings.ejs for each Wix UI component.
         *      'key': specific to which Wix UI component is being set.
         *          Keys can be returned/printed with Wix.UI.get('wix-model-name').
         *          Look at Wix UI Lib for more information.
         *
         * @param template
         */
        var setDesignOptions = function (template) {
            Wix.UI.set('color', {cssColor: template.text.color});
            Wix.UI.set('bcolorWOpacity', {rgba: template.background.color, opacity:template.background.opacity});
            Wix.UI.set('bOpacitySpinner', template.background.opacity * 100);
            Wix.UI.set('hcolorWOpacity', {rgba: template.hover.color, opacity:template.hover.opacity});
            Wix.UI.set('hOpacitySlider', template.hover.opacity * 100);
            Wix.UI.set('borderColor', {cssColor: template.border.color});
            Wix.UI.set('borderWidth', template.border.width);
            Wix.UI.set('radius', template.border.radius);
            Wix.UI.set('hoverCheckbox', template.hover.selected);
        };

        /**
         * Corresponds to 'Reset Design' button in Settings UI.
         * Resets changes made in Settings to current template's defaults.
         * Resets WidgetUI as well.
         */
        this.resetTemplate = function() {
            var template = getTemplateDesign(settings.design.template);
            setDesignOptions(template);
            settings.design = template;
            $scope.updateComponent(settings);
        };

        /**
         * Changes settings from old template to new template
         * keeping user changes in tact.
         *
         * @param newSettings - new template data
         */
        var applySettingsChangesToNewTemplate = function(newSettings) {

            /* Get instance of former default template settings */
            var originalDesign = getTemplateDesign(settings.design.template);

            /* Get instance of new default template */
            var template = getTemplateDesign(newSettings.value);

            /* Get instance of user's current template settings */
            var customDesign = JSON.parse(JSON.stringify(settings.design));

            /*
             * Iterates over all changes between the original template values and current user values
             * to determine where the user made changes to the defaults
             */
            DeepDiff.observableDiff(originalDesign, customDesign, function (difference) {
                // apply the change to the newly selected template
                DeepDiff.applyChange(template,template, difference);
            });

            /* Setting new template data */
            setDesignOptions(template);
            settings.design = template;
        };

        /********************************************************************************
         * EVENT LISTENERS for all changes in design tab of settings.
         * Uses Wix UI Lib and wix-models to listen to changes and
         * update settings data.
         *
         * Example:
         *      Wix.UI.onChange('wix-model-name', doSomethingWith(newSettings){});
         *          'wix-model-name' - set in settings.ejs for each Wix UI component
         *           doSomethingWith - callback that does something with updated data
         *           newSettings - JSON representing change to wix-model component
         *
         * Changes are persisted to WidgetUI via updateComponent(newSettings)
         *******************************************************************************/

        /**
         * Event listener for template wix-model changes.
         * Corresponds to the four template options at the
         * top of Settings Design tab.
         *
         * Updates Widget UI to template change with updateComponent(newSettings).
         *
         * @param newSettings - new template data
         */
        Wix.UI.onChange('template', function(newSettings){
            applySettingsChangesToNewTemplate(newSettings);
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for text color changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new color data
         */
        Wix.UI.onChange('color', function(newSettings){
            settings.design.text.color = newSettings.cssColor;
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for text-align changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new text-align data
         */
        Wix.UI.onChange('textAlignGroup', function(newSettings){
            settings.design.text.alignment = newSettings.value;
            $scope.updateComponent(settings);
        });

        //TODO extract to common utils, I've seen this before
        var parseRBGA = function(rgba) {
            return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
        };

        /**
         * Event listener for background color picker changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new background color data
         */
        Wix.UI.onChange('bcolorWOpacity', function(newSettings){
            /* Color and opacity are saved with separate keys*/
            settings.design.background.color = newSettings.rgba;
            settings.design.background.opacity = newSettings.opacity;

            /* Updates opacity spinner with new opacity data */
            Wix.UI.set('bOpacitySpinner', settings.design.background.opacity * 100);
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for opacity spinner changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new opacity data
         */
        Wix.UI.onChange('bOpacitySpinner', function(newSettings){
            var currRGBA = parseRBGA(settings.design.background.color);
            settings.design.background.color = "rgba(" + currRGBA[0] + "," + currRGBA[1] + "," + currRGBA[2] + "," + newSettings/100 + ")";
            settings.design.background.opacity = newSettings/100;

            /* Updates background color picker with new opacity data */
            Wix.UI.set('bcolorWOpacity',{rgba: settings.design.background.color, opacity:settings.design.background.opacity});
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for hover checkbox changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new checkbox data
         */
        Wix.UI.onChange('hoverCheckbox', function(newSettings){
            settings.design.hover.selected = newSettings;
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for hover color picker changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new hover color data
         */
        Wix.UI.onChange('hcolorWOpacity', function(newSettings){
            /* Automatically toggles hover checkbox to on if hover color selected */
            if (!settings.design.hover.selected) {
                Wix.UI.set('hoverCheckbox', true);
            }

            /* Color and opacity saved as separate values */
            settings.design.hover.color = newSettings.rgba;
            settings.design.hover.opacity = newSettings.opacity;

            /* Updates hover opacity slider to new opacity data */
            Wix.UI.set('hOpacitySlider', settings.design.hover.opacity * 100);
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for hover opacity slider changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new opacity data
         */
        Wix.UI.onChange('hOpacitySlider', function(newSettings){
            /* Automatically toggles hover checkbox to on if hover opacity changed */
            if (!settings.design.hover.selected) {
                Wix.UI.set('hoverCheckbox', true);
            }

            var currRGBA = parseRBGA(settings.design.hover.color);
            settings.design.hover.color = "rgba(" + currRGBA[0] + "," + currRGBA[1] + "," + currRGBA[2] + "," + newSettings/100 + ")";
            settings.design.hover.opacity = newSettings/100;
            Wix.UI.set('hcolorWOpacity',{rgba: settings.design.hover.color, opacity:settings.design.hover.opacity});
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for border color picker changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new border color data
         */
        Wix.UI.onChange('borderColor', function(newSettings){
            settings.design.border.color = newSettings.cssColor;
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for border width slider changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new border width data
         */
        Wix.UI.onChange('borderWidth', function(newSettings){
            settings.design.border.width = newSettings;
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for corner radius changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new corner radius data
         */
        Wix.UI.onChange('radius', function(newSettings){
            settings.design.border.radius = newSettings;
            $scope.updateComponent(settings);
        });

        /****************************************************
         *  Manage Notes Screen
         ****************************************************/

        /**
         * Shows the manage notes screen.
         * Corresponds to 'Manage Notes' button in Settings.
         *
         * Uses angular's ng-show/hide via $scope.visibleManageNotes boolean.
         */
        $scope.visibleManageNotes = false;
        this.showManageNotes = function() {
            /* Set to true when manage notes screen should be visible */
            $scope.visibleManageNotes = true;

            /*
             * JQuery needed to remove max-character notification when the
             * user reopens the settings panel. This is a personal
             * design preference
             */
            $('.character-count-normal').removeClass('character-count-max');
            $('textarea').removeClass('note-text-max-count');
        };

        /**
         * Hides the manage notes screen.
         * Corresponds to 'Back to Settings' button in manage notes screen.
         *
         * Uses angular's ng-show/hide via $scope.visibleManageNotes boolean.
         */
        this.hideManageNotes = function() {
            /* Set to false when manage notes screen should be hidden */
            $scope.visibleManageNotes = false;
        };

        /**
         * Updates database and Widget upon textarea blur.
         * Saves new text, displays in widget.
         */
        this.blur = function() {
            /*
             * JQuery needed to remove max-character notification when the
             * user blurs away from a textarea. This is a personal
             * design preference.
             */
            $('.character-count-normal').removeClass('character-count-max');
            $('textarea').removeClass('note-text-max-count');

            $scope.updateComponent(settings);

        };

        /* SPECIAL CASE: $scope.settings needed for $watchCollection below. Nowhere else.*/
        $scope.settings = $window.settings;

        /**
         * Watches for any changes in the 'settings.notes' array.
         * I.e. notes that are added, deleted, or swapped places.
         *
         * Saves the changes with updateComponent.
         *
         * @param 'settings.note' - collection to be watched
         * @param callback - do something when change detected
         */
        $scope.$watchCollection('settings.notes', function() {
            $scope.updateComponent(settings);
        });

        /**
         * Adds a new note to manage notes screen.
         * Corresponds to 'Add a note' button.
         */
        this.addNote = function () {
            /*
             * Pushes a new note, with default settings, to settings.notes array.
             * Automatically updates Manage Notes UI via angular watch function.
             */
            settings.notes.push({"visibility" : true, "msg" : "", key : uniqueNoteKey(),
                link:{type:"",url:"",display:"", targetVal:"0"}});

            /* Autofocuses newly added note */
            focusNewNote();
        };

        /**
         * Returns a unique key id to be assigned to each note as they are added.
         *
         * Needed in order to properly transition notes in
         * Preview and Publish.  This unique key is how the
         * ReactCSSTransitions keep track of which note is
         * transition in and which note is tranition out.
         *
         * @returns string - unique key id
         */
        var uniqueNoteKey = function() {
            var key;
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            key = (s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4());
            return key;
        };

        /**
         * Autofocuses new note's textarea when it is added to manage notes screen.
         */
        var focusNewNote = function () {
            /* Uses a timeout to confirm function runs after new note is added & saved */
            $timeout(function() {
                var array = $("textarea");
                var el = $(array[array.length-1]);
                el.focus();
            },0);

        };

        /**
         * Focuses the textarea of specified note textarea.
         * Corresponds to edit-button on right of note in manage notes screen.
         *
         * @param e - element to focus
         * @param index - index in settings.notes array of specified note
         */
        this.editNoteButton = function(e, index) {
            /* Checks to make sure note visibility is true. Don't want to focus hidden note. */
            if (this.settings.notes[index].visibility) {
                this.focusText(e);
            }
        };

        /**
         * Blurs away from current focused textarea and focuses
         * on the newly clicked textarea.
         *
         * This function is needed to save changes made in the
         * formerly focused textarea before focusing on a new one.
         *
         * @param element - textarea to focus
         */
        this.focusText = function (element) {
            /* Uses a timeout to confirm function runs after new note is added & saved */
            $timeout(function() {
                if (!($("textarea:focus")) ) {
                    $("textarea:focus").blur();
                }
                $(element.target).closest('.note-container').find('textarea').focus();
            }, 0, false);
        };

        /**
         * Removes note settings.notes array.
         * The watchCollection function ensures note removed from Manage Notes screen as well.
         *
         * @param notes - array of notes
         * @param index - index of note to be removed
         */
        this.deleteNote = function(notes, index) {
            notes.splice(index, 1);
        };

        /**
         * Variables used in settings.ejs with angular's ng-show/hide
         * to show note-icons on hover.
         */
        $scope.hiddenNote = false;
        $scope.showIcons = false;

        /****************************************************
         *  Transition Settings (second tab of settings)
         ****************************************************/


        /********************************************************************************
         * EVENT LISTENERS for all changes in transition tab of settings.
         * Uses Wix UI Lib and wix-models to listen to changes and
         * update settings data.
         *
         * Example:
         *      Wix.UI.onChange('wix-model-name', doSomethingWith(newSettings){});
         *          'wix-model-name' - set in settings.ejs for each Wix UI component
         *           doSomethingWith - callback that does something with updated data
         *           newSettings - JSON representing change to wix-model component
         *
         * Changes are persisted to WidgetUI via updateComponent(newSettings)
         *******************************************************************************/

        /**
         * Event listener for transition wix-model changes.
         * Corresponds to the four transition options at the
         * top of Settings Transition tab.
         *
         * Plays a preview of the selected transition on click.
         *
         * @param newSettings - new transition data
         */
        var that = this;
        Wix.UI.onChange('transition', function(newSettings){
            settings.transition.effect = newSettings.value;
            that.playPreview();
        });

        /**
         * Event listener for transition duration wix-model changes.
         * Corresponds to the duration slider in transition tab.
         *
         * Updates Widget UI to duration changes with updateComponent(newSettings).
         *
         * @param newSettings - new duration slider data
         */
        Wix.UI.onChange('duration', function(newSettings){
            settings.transition.duration = Math.round(newSettings);
            $scope.updateComponent(settings);
        });

        /**
         * Replays preview when transition option is re-clicked
         */
        this.playPreview = function() {
            /* Sets preview to true in order to preview note in WidgetUI.
             * Sets preview back to false to stop playing notes once preview is finished */
            settings.transition.preview = true;
            $scope.updateComponent(settings);
            settings.transition.preview = false;
        };

        /*********************************************
         *  Add Link Popup dialog box
         *********************************************/

        /**
         * Scoped variables used with angular directives
         * to display link popup and its components.
         */
        $scope.popupVisible = false;
        $scope.upperTextVisible = false;
        $scope.buttonsVisible = false;
        $scope.optionsVisible = false;
        $scope.linkOption = 0;

        /**
         * Shows link popup.
         * Corresponds to the 'Add a Link' button at the bottom of each note on hover.
         *
         * @param note - note the added link corresponds to
         */
        this.showLinkPopup = function(note) {
            this.noteForLink = note;

            /* These changes trigger angular directives to show
             * and hide various HTML Dom elements accordingly */
            $scope.popupVisible = true;
            $scope.buttonsVisible = true;
            $scope.linkOption = 0;

            /* Loading an array of the user's site pages. Used if the user wants to add a site link. */
            loadPageDropdown();
        };

        /**
         * Shows the specified link option.
         * Corresponds to which button the user picks in the link popup.
         *
         * @param type - which link option to show
         */
        this.showLink = function(type) {
            /* These changes trigger angular directives to show
             * and hide various HTML Dom elements accordingly */
            $scope.buttonsVisible = false;
            $scope.optionsVisible = true;
            $scope.linkOption = type;
        };

        /**
         * Closes the link popup dialog.
         *
         * Uses angular scoped variables and directives to hide HTML elements.
         */
        this.closeLinkPopup = function(){
            $scope.popupVisible = false;
            $scope.upperTextVisible = false;
            $scope.buttonsVisible = false;
            $scope.optionsVisible = false;
            $scope.linkOption = 0;
        };

        /**
         * Saves and constructs the selected link and connects it to the note it was added to.
         * Corresponds to the 'OK' button in the link popup.
         */
        this.setLink = function() {
            /* Saves the link url that was created by the user */
            $scope.options = {1 : 'webLink', 2: 'pageLink', 3: 'emailLink', 4: 'docLink'};
            var chosenLink = $scope.options[$scope.linkOption];
            var link = this.noteForLink[chosenLink];

            /* Resets the other links back to blank strings */
            clearLinks(this.noteForLink);




            /* Sets note to chosen link and url */
            this.noteForLink[chosenLink] = link;
            this.noteForLink.link.url = link;

            /* Each type of link require different construction */
            /* link.display is what is seen by the user after the link is added */
            /* link.url is what is put in the href */
            switch($scope.linkOption) {
                case 1: //web-link
                {
                    this.noteForLink.link.display = link;
                    console.log('targetVal: ' + this.noteForLink.link.targetVal);
                    if (this.noteForLink.link.targetVal === '1') {
                        this.noteForLink.link.target = '_top';
                    } else {
                        this.noteForLink.link.target = '_blank';
                    }
                    console.log('Target: ' + this.noteForLink.link.target);
                    break;
                }
                case 2: //page-link
                {
                    var that = this;
                    var scope = $scope;

                    var index = settings.pages.indexOf(this.noteForLink.pageLink);
                    this.noteForLink.link.display = link;
                    this.noteForLink.link.target = '_top';

                    /* Grabbing and contructing page-link url from Wix site */
                    Wix.Worker.getSiteInfo(function (siteInfo) {
                        that.noteForLink.link.url = siteInfo.baseUrl + '#!/' + that.settings.pageIds[index];
                        scope.updateComponent(that.settings);
                    });
                    break;
                }
                case 3: //email-link
                {
                    this.noteForLink.link.url = mailLink(this.noteForLink.emailLink,{subject: this.noteForLink.link.subject});
                    this.noteForLink.link.display = "mail to: " + this.noteForLink.emailLink;
                    this.noteForLink.link.target = '';
                    break;
                }
                case 4: //doc-link
                {
                    this.noteForLink.link.target = '_blank';

                    /* This allows the Widget to know if it should grab the static Wix
                        url from the relative Uri provided through its media upload dialog. */
                    this.noteForLink.link.doc = true;
                    break;
                }
            }

            /* Cuts the display link to only 30 characters for aesthetics */
            this.noteForLink.link.display = this.noteForLink.link.display.substring(0, 30);

            $scope.updateComponent(settings);
            this.closeLinkPopup();
        };

        /**
         * Returns to Link options in popup.
         * Corresponds to 'Back to link options' button in link popup.
         */
        this.backToOptions = function() {
            $scope.optionsVisible = false;
            $scope.buttonsVisible = true;
            $scope.linkOption = 0;
        };

        /**
         * Resets link data to blank string.
         *
         * @param note - the note the link corresponds to
         */
        var clearLinks = function(note) {
            note.webLink = "";
            note.pageLink = "";
            note.emailLink = "";
            note.docLink = "";
            note.link.doc = false;
            note.link.subject = "";
            note.link.url = "";
        };

        /**
         * Clears the link while also clearing the link-display on the note itself.
         *
         * @param note
         */
        this.removeLink = function(note) {
            clearLinks(note);
            note.link.display = "";
            $scope.updateComponent(settings);
            this.closeLinkPopup();
        };

        /**
         * Loads the user's site pages for picking a page link.
         */
        var loadPageDropdown = function() {
            Wix.getSitePages(function (sitePages) {
                settings.pages = _.pluck(sitePages, 'title');
                settings.pageIds = _.pluck(sitePages, 'id');
            });
        };

        /**
         * Constructs a mail-to url for if the user wants to
         * and an email-link from link popup.
         *
         * @param recepient
         * @param opts
         * @returns {string}
         */
        var mailLink = function(recepient, opts) {
            var link = "mailto:";
            link += window.encodeURIComponent(recepient);
            var params = [];
            angular.forEach(opts, function(value, key) {
                params.push(key.toLowerCase() + "=" + window.encodeURIComponent(value));
            });
            if (params.length > 0) {
                link += "?" + params.join("&");
            }
            return link;
        };

        /**
         * Opens up Wix's document upload popup.
         * Configures the attachment's url and saves
         * the url and display data.
         */
        this.docLink = function() {
            var that = this;
            var scope = $scope;

            /* Opens Wix's document uplaod dialog */
            Wix.Settings.openMediaDialog( Wix.Settings.MediaType.DOCUMENT, false, function(data) {
                var documentUrl = Wix.Utils.Media.getDocumentUrl(data.relativeUri);
//                that.noteForLink.docLink = documentUrl;
                that.noteForLink.docLink = data.relativeUri;

                /* SPECIAL CASE: Needed by Angular to detect when variables are changed
                * to update immediately */
                $scope.$apply(function () {
                    that.noteForLink.link.display = data.fileName;
                    that.noteForLink.link.display = that.noteForLink.link.display.substring(0, 30);
                    scope.updateComponent(settings);
                });
            });
        };

        /**
         * SPECIAL CASE: Creates a custom HTML tag that saves
         * the user's color theme.  This is needed to create a
         * default note template that reflects each site's custom
         * color theme.
         */
        $(document).ready(function( ){
            //Loading/Saving color scheme for default note color.. no easy way to do this
            var siteTemplateColor = document.registerElement('site-template-colors');
            document.body.appendChild(new siteTemplateColor());

            var styles = ['color', 'background-color', 'border-color'];
            siteColorStyles = $('site-template-colors').css(styles);
            siteColorStyles.hover = $('site-template-colors').css('outline-color');

            if (settings.design.text.color === 'color-1') {
                settings.design = getTemplateDesign('defaultNote');
            }
        });
    }]);

    /**
     * Custom Angular directive that validates web-links to make
     * sure they include the https prefix.
     */
    app.directive('httpPrefix', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, controller) {
                function ensureHttpPrefix(value) {
                    // Need to add prefix if we don't have http:// prefix already AND we don't have part of it
                    if(value && !/^(https):\/\//i.test(value) && 'https://'.indexOf(value) === -1) {
                        controller.$setViewValue('https://' + value);
                        controller.$render();
                        return 'https://' + value;
                    }
                    else
                        return value;
                }
                controller.$formatters.push(ensureHttpPrefix);
                controller.$parsers.push(ensureHttpPrefix);
            }
        };
    });

})();




},{"./defaultTemplates":"/Users/elanas/Desktop/Wix Projects/rolling-notes/public/javascripts/defaultTemplates.js"}]},{},["/Users/elanas/Desktop/Wix Projects/rolling-notes/public/javascripts/settings-app.js"]);

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_53815873.js","/")
},{"./defaultTemplates":5,"buffer":1,"oMfpAn":4}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9lbGFuYXMvRGVza3RvcC9XaXggUHJvamVjdHMvcm9sbGluZy1ub3Rlcy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZWxhbmFzL0Rlc2t0b3AvV2l4IFByb2plY3RzL3JvbGxpbmctbm90ZXMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiL1VzZXJzL2VsYW5hcy9EZXNrdG9wL1dpeCBQcm9qZWN0cy9yb2xsaW5nLW5vdGVzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCIvVXNlcnMvZWxhbmFzL0Rlc2t0b3AvV2l4IFByb2plY3RzL3JvbGxpbmctbm90ZXMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiL1VzZXJzL2VsYW5hcy9EZXNrdG9wL1dpeCBQcm9qZWN0cy9yb2xsaW5nLW5vdGVzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9lbGFuYXMvRGVza3RvcC9XaXggUHJvamVjdHMvcm9sbGluZy1ub3Rlcy9wdWJsaWMvamF2YXNjcmlwdHMvZGVmYXVsdFRlbXBsYXRlcy5qcyIsIi9Vc2Vycy9lbGFuYXMvRGVza3RvcC9XaXggUHJvamVjdHMvcm9sbGluZy1ub3Rlcy9wdWJsaWMvamF2YXNjcmlwdHMvZmFrZV81MzgxNTg3My5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmxDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5fdXNlVHlwZWRBcnJheXNgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xuQnVmZmVyLl91c2VUeXBlZEFycmF5cyA9IChmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssXG4gIC8vIENocm9tZSA3KywgU2FmYXJpIDUuMSssIE9wZXJhIDExLjYrLCBpT1MgNC4yKy4gSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBhZGRpbmdcbiAgLy8gcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLCB0aGVuIHRoYXQncyB0aGUgc2FtZSBhcyBubyBgVWludDhBcnJheWAgc3VwcG9ydFxuICAvLyBiZWNhdXNlIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBhZGQgYWxsIHRoZSBub2RlIEJ1ZmZlciBBUEkgbWV0aG9kcy4gVGhpcyBpcyBhbiBpc3N1ZVxuICAvLyBpbiBGaXJlZm94IDQtMjkuIE5vdyBmaXhlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJlxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nIC8vIENocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBXb3JrYXJvdW5kOiBub2RlJ3MgYmFzZTY0IGltcGxlbWVudGF0aW9uIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBzdHJpbmdzXG4gIC8vIHdoaWxlIGJhc2U2NC1qcyBkb2VzIG5vdC5cbiAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JyAmJiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpXG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyAnPSdcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpIC8vIGFzc3VtZSB0aGF0IG9iamVjdCBpcyBhcnJheS1saWtlXG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSlcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdFtpXVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9PSBudWxsICYmIGIgIT09IHVuZGVmaW5lZCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggLyAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoICogMlxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgYXNzZXJ0KGlzQXJyYXkobGlzdCksICdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbicgK1xuICAgICAgJ2xpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyXG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIF91dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kICE9PSB1bmRlZmluZWQpXG4gICAgPyBOdW1iZXIoZW5kKVxuICAgIDogZW5kID0gc2VsZi5sZW5ndGhcblxuICAvLyBGYXN0cGF0aCBlbXB0eSBzdHJpbmdzXG4gIGlmIChlbmQgPT09IHN0YXJ0KVxuICAgIHJldHVybiAnJ1xuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpKzFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gYnVmW29mZnNldF0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMl0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIHZhbCB8PSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMClcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAxXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDNdXG4gICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHRoaXMud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHRoaXMud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgMHhmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQzMihidWYsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSksICd2YWx1ZSBpcyBub3QgYSBudW1iZXInKVxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdGhpc1tpXSA9IHZhbHVlXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3V0ID0gW11cbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBvdXRbaV0gPSB0b0hleCh0aGlzW2ldKVxuICAgIGlmIChpID09PSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTKSB7XG4gICAgICBvdXRbaSArIDFdID0gJy4uLidcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+J1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSlcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG4vLyBzbGljZShzdGFydCwgZW5kKVxuZnVuY3Rpb24gY2xhbXAgKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICBpbmRleCA9IH5+aW5kZXg7ICAvLyBDb2VyY2UgdG8gaW50ZWdlci5cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIGluZGV4ICs9IGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvZXJjZSAobGVuZ3RoKSB7XG4gIC8vIENvZXJjZSBsZW5ndGggdG8gYSBudW1iZXIgKHBvc3NpYmx5IE5hTiksIHJvdW5kIHVwXG4gIC8vIGluIGNhc2UgaXQncyBmcmFjdGlvbmFsIChlLmcuIDEyMy40NTYpIHRoZW4gZG8gYVxuICAvLyBkb3VibGUgbmVnYXRlIHRvIGNvZXJjZSBhIE5hTiB0byAwLiBFYXN5LCByaWdodD9cbiAgbGVuZ3RoID0gfn5NYXRoLmNlaWwoK2xlbmd0aClcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdWJqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICB9KShzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlID49IDAsICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbn1cblxuZnVuY3Rpb24gYXNzZXJ0ICh0ZXN0LCBtZXNzYWdlKSB7XG4gIGlmICghdGVzdCkgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UgfHwgJ0ZhaWxlZCBhc3NlcnRpb24nKVxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlclwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbnZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NFwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3NcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogREVGQVVMVCBOT1RFIFRFTVBMQVRFU1xuICpcbiAqIEluY2x1ZGVzIGZvdXIgcHJlLWxvYWRlZCBub3RlIHRlbXBsYXRlcy5cbiAqIEVhY2ggdGVtcGxhdGUgaXMgZXhwb3J0ZWQgdG8gYmUgdXNlZCBpbiBzZXR0aW5ncy1hcHAgdG8gbG9hZCB3aWRnZXQuXG4gKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbi8qIE5vdGUgdGVtcGxhdGUgdGhhdCBjb3JyZXNwb25kcyB0byB1c2VyJ3Mgc2l0ZSBjb2xvciBzY2hlbWUgICovXG5leHBvcnRzLmRlZmF1bHROb3RlID0ge1xuICAgIFwiZGVzaWduXCIgOiB7XG4gICAgICAgIFwidGVtcGxhdGVcIiA6IFwiZGVmYXVsdE5vdGVcIixcbiAgICAgICAgXCJ0ZXh0XCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcImNvbG9yLTFcIixcbiAgICAgICAgICAgIFwicHJlc2V0XCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJhbGlnbm1lbnRcIiA6IFwiY2VudGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYWNrZ3JvdW5kXCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcImNvbG9yLThcIixcbiAgICAgICAgICAgIFwib3BhY2l0eVwiIDogXCIxXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJob3ZlclwiIDoge1xuICAgICAgICAgICAgXCJzZWxlY3RlZFwiIDogdHJ1ZSxcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwiY29sb3ItOVwiLFxuICAgICAgICAgICAgXCJvcGFjaXR5XCIgOiBcIjFcIlxuICAgICAgICB9LFxuICAgICAgICBcImJvcmRlclwiIDoge1xuICAgICAgICAgICAgXCJjb2xvclwiIDogXCJjb2xvci02XCIsXG4gICAgICAgICAgICBcIndpZHRoXCIgOiBcIjRcIixcbiAgICAgICAgICAgIFwicmFkaXVzXCIgOiBcIjBcIlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIFwidHJhbnNpdGlvblwiIDoge1xuICAgICAgICBcImVmZmVjdFwiIDogXCJmYWRlXCIsXG4gICAgICAgIFwicHJldmlld1wiIDogXCJmYWxzZVwiLFxuICAgICAgICBcImR1cmF0aW9uXCIgOiBcIjJcIlxuICAgIH0sXG5cbiAgICBcIm5vdGVzXCI6W11cbn07XG5cbi8qIE5vdGUgdGVtcGxhdGUgdGhhdCBsb29rcyBsaWtlIGEgc3BpcmFsIG5vdGVwYWQgICovXG5leHBvcnRzLnNwaXJhbE5vdGUgPSB7XG4gICAgXCJkZXNpZ25cIiA6IHtcbiAgICAgICAgXCJ0ZW1wbGF0ZVwiIDogXCJzcGlyYWxOb3RlXCIsXG4gICAgICAgIFwidGV4dFwiIDoge1xuICAgICAgICAgICAgXCJjb2xvclwiIDogXCIjMDAwMDAwXCIsXG4gICAgICAgICAgICBcInByZXNldFwiOiBcIkJvZHktTFwiLFxuICAgICAgICAgICAgXCJhbGlnbm1lbnRcIiA6IFwiY2VudGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYWNrZ3JvdW5kXCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcInJnYmEoMjU1LDI1NSwyNTUsMSlcIixcbiAgICAgICAgICAgIFwib3BhY2l0eVwiIDogXCIxXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJob3ZlclwiIDoge1xuICAgICAgICAgICAgXCJzZWxlY3RlZFwiIDogdHJ1ZSxcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwicmdiYSgxNzUsMjA0LDI1NSwxKVwiLFxuICAgICAgICAgICAgXCJvcGFjaXR5XCIgOiBcIjFcIlxuICAgICAgICB9LFxuICAgICAgICBcImJvcmRlclwiIDoge1xuICAgICAgICAgICAgXCJjb2xvclwiIDogXCIjNTA1QzczXCIsXG4gICAgICAgICAgICBcIndpZHRoXCIgOiBcIjBcIixcbiAgICAgICAgICAgIFwicmFkaXVzXCIgOiBcIjZcIlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIFwidHJhbnNpdGlvblwiIDoge1xuICAgICAgICBcImVmZmVjdFwiIDogXCJmYWRlXCIsXG4gICAgICAgIFwicHJldmlld1wiIDogXCJmYWxzZVwiLFxuICAgICAgICBcImR1cmF0aW9uXCIgOiBcIjJcIlxuICAgIH0sXG5cbiAgICBcIm5vdGVzXCI6W11cbn07XG5cbi8qIE5vdGUgdGVtcGxhdGUgdGhhdCBsb29rcyBsaWtlIGEgcG9zdGl0IG5vdGUgKi9cbmV4cG9ydHMucG9zdGl0Tm90ZSA9IHtcbiAgICBcImRlc2lnblwiIDoge1xuICAgICAgICBcInRlbXBsYXRlXCIgOiBcInBvc3RpdE5vdGVcIixcbiAgICAgICAgXCJ0ZXh0XCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcIiMwMDAwMDBcIixcbiAgICAgICAgICAgIFwicHJlc2V0XCI6IFwiQm9keS1MXCIsXG4gICAgICAgICAgICBcImFsaWdubWVudFwiIDogXCJjZW50ZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhY2tncm91bmRcIiA6IHtcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwicmdiYSgyNTEsMjM5LDE3MiwxKVwiLFxuICAgICAgICAgICAgXCJvcGFjaXR5XCIgOiBcIjFcIlxuICAgICAgICB9LFxuICAgICAgICBcImhvdmVyXCIgOiB7XG4gICAgICAgICAgICBcInNlbGVjdGVkXCIgOiB0cnVlLFxuICAgICAgICAgICAgXCJjb2xvclwiIDogXCJyZ2JhKDI1MSwyMjcsOTcsMSlcIixcbiAgICAgICAgICAgIFwib3BhY2l0eVwiIDogXCIxXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJib3JkZXJcIiA6IHtcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwiIzNmM2EyNlwiLFxuICAgICAgICAgICAgXCJ3aWR0aFwiIDogXCIwXCIsXG4gICAgICAgICAgICBcInJhZGl1c1wiIDogXCIzXCJcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXCJ0cmFuc2l0aW9uXCIgOiB7XG4gICAgICAgIFwiZWZmZWN0XCIgOiBcImZhZGVcIixcbiAgICAgICAgXCJwcmV2aWV3XCIgOiBcImZhbHNlXCIsXG4gICAgICAgIFwiZHVyYXRpb25cIiA6IFwiMlwiXG4gICAgfSxcblxuICAgIFwibm90ZXNcIjpbXVxufTtcblxuLyogTm90ZSB0ZW1wbGF0ZSB0aGF0IGxvb2tzIGxpa2UgYSBjaGFsa2JvYXJkICAqL1xuZXhwb3J0cy5jaGFsa2JvYXJkTm90ZSA9IHtcbiAgICBcImRlc2lnblwiIDoge1xuICAgICAgICBcInRlbXBsYXRlXCIgOiBcImNoYWxrYm9hcmROb3RlXCIsXG4gICAgICAgIFwidGV4dFwiIDoge1xuICAgICAgICAgICAgXCJjb2xvclwiIDogXCIjRkZGRkZGXCIsXG4gICAgICAgICAgICBcInByZXNldFwiOiBcIkJvZHktTFwiLFxuICAgICAgICAgICAgXCJhbGlnbm1lbnRcIiA6IFwiY2VudGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYWNrZ3JvdW5kXCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcInJnYmEoNzIsMTA0LDM1LDEpXCIsXG4gICAgICAgICAgICBcIm9wYWNpdHlcIiA6IFwiMVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiaG92ZXJcIiA6IHtcbiAgICAgICAgICAgIFwic2VsZWN0ZWRcIiA6IHRydWUsXG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcInJnYmEoOTQsMTQxLDQ4LDEpXCIsXG4gICAgICAgICAgICBcIm9wYWNpdHlcIiA6IFwiMVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYm9yZGVyXCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcIiNGRkZGRkZcIixcbiAgICAgICAgICAgIFwid2lkdGhcIiA6IFwiOFwiLFxuICAgICAgICAgICAgXCJyYWRpdXNcIiA6IFwiOFwiXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgXCJ0cmFuc2l0aW9uXCIgOiB7XG4gICAgICAgIFwiZWZmZWN0XCIgOiBcImZhZGVcIixcbiAgICAgICAgXCJwcmV2aWV3XCIgOiBcImZhbHNlXCIsXG4gICAgICAgIFwiZHVyYXRpb25cIiA6IFwiMlwiXG4gICAgfSxcblxuICAgIFwibm90ZXNcIjpbXVxufTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvZGVmYXVsdFRlbXBsYXRlcy5qc1wiLFwiL1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pKHtcIi9Vc2Vycy9lbGFuYXMvRGVza3RvcC9XaXggUHJvamVjdHMvcm9sbGluZy1ub3Rlcy9wdWJsaWMvamF2YXNjcmlwdHMvZGVmYXVsdFRlbXBsYXRlcy5qc1wiOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBERUZBVUxUIE5PVEUgVEVNUExBVEVTXG4gKlxuICogSW5jbHVkZXMgZm91ciBwcmUtbG9hZGVkIG5vdGUgdGVtcGxhdGVzLlxuICogRWFjaCB0ZW1wbGF0ZSBpcyBleHBvcnRlZCB0byBiZSB1c2VkIGluIHNldHRpbmdzLWFwcCB0byBsb2FkIHdpZGdldC5cbiAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuLyogTm90ZSB0ZW1wbGF0ZSB0aGF0IGNvcnJlc3BvbmRzIHRvIHVzZXIncyBzaXRlIGNvbG9yIHNjaGVtZSAgKi9cbmV4cG9ydHMuZGVmYXVsdE5vdGUgPSB7XG4gICAgXCJkZXNpZ25cIiA6IHtcbiAgICAgICAgXCJ0ZW1wbGF0ZVwiIDogXCJkZWZhdWx0Tm90ZVwiLFxuICAgICAgICBcInRleHRcIiA6IHtcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwiY29sb3ItMVwiLFxuICAgICAgICAgICAgXCJwcmVzZXRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImFsaWdubWVudFwiIDogXCJjZW50ZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhY2tncm91bmRcIiA6IHtcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwiY29sb3ItOFwiLFxuICAgICAgICAgICAgXCJvcGFjaXR5XCIgOiBcIjFcIlxuICAgICAgICB9LFxuICAgICAgICBcImhvdmVyXCIgOiB7XG4gICAgICAgICAgICBcInNlbGVjdGVkXCIgOiB0cnVlLFxuICAgICAgICAgICAgXCJjb2xvclwiIDogXCJjb2xvci05XCIsXG4gICAgICAgICAgICBcIm9wYWNpdHlcIiA6IFwiMVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYm9yZGVyXCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcImNvbG9yLTZcIixcbiAgICAgICAgICAgIFwid2lkdGhcIiA6IFwiNFwiLFxuICAgICAgICAgICAgXCJyYWRpdXNcIiA6IFwiMFwiXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgXCJ0cmFuc2l0aW9uXCIgOiB7XG4gICAgICAgIFwiZWZmZWN0XCIgOiBcImZhZGVcIixcbiAgICAgICAgXCJwcmV2aWV3XCIgOiBcImZhbHNlXCIsXG4gICAgICAgIFwiZHVyYXRpb25cIiA6IFwiMlwiXG4gICAgfSxcblxuICAgIFwibm90ZXNcIjpbXVxufTtcblxuLyogTm90ZSB0ZW1wbGF0ZSB0aGF0IGxvb2tzIGxpa2UgYSBzcGlyYWwgbm90ZXBhZCAgKi9cbmV4cG9ydHMuc3BpcmFsTm90ZSA9IHtcbiAgICBcImRlc2lnblwiIDoge1xuICAgICAgICBcInRlbXBsYXRlXCIgOiBcInNwaXJhbE5vdGVcIixcbiAgICAgICAgXCJ0ZXh0XCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcIiMwMDAwMDBcIixcbiAgICAgICAgICAgIFwicHJlc2V0XCI6IFwiQm9keS1MXCIsXG4gICAgICAgICAgICBcImFsaWdubWVudFwiIDogXCJjZW50ZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhY2tncm91bmRcIiA6IHtcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwicmdiYSgyNTUsMjU1LDI1NSwxKVwiLFxuICAgICAgICAgICAgXCJvcGFjaXR5XCIgOiBcIjFcIlxuICAgICAgICB9LFxuICAgICAgICBcImhvdmVyXCIgOiB7XG4gICAgICAgICAgICBcInNlbGVjdGVkXCIgOiB0cnVlLFxuICAgICAgICAgICAgXCJjb2xvclwiIDogXCJyZ2JhKDE3NSwyMDQsMjU1LDEpXCIsXG4gICAgICAgICAgICBcIm9wYWNpdHlcIiA6IFwiMVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYm9yZGVyXCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcIiM1MDVDNzNcIixcbiAgICAgICAgICAgIFwid2lkdGhcIiA6IFwiMFwiLFxuICAgICAgICAgICAgXCJyYWRpdXNcIiA6IFwiNlwiXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgXCJ0cmFuc2l0aW9uXCIgOiB7XG4gICAgICAgIFwiZWZmZWN0XCIgOiBcImZhZGVcIixcbiAgICAgICAgXCJwcmV2aWV3XCIgOiBcImZhbHNlXCIsXG4gICAgICAgIFwiZHVyYXRpb25cIiA6IFwiMlwiXG4gICAgfSxcblxuICAgIFwibm90ZXNcIjpbXVxufTtcblxuLyogTm90ZSB0ZW1wbGF0ZSB0aGF0IGxvb2tzIGxpa2UgYSBwb3N0aXQgbm90ZSAqL1xuZXhwb3J0cy5wb3N0aXROb3RlID0ge1xuICAgIFwiZGVzaWduXCIgOiB7XG4gICAgICAgIFwidGVtcGxhdGVcIiA6IFwicG9zdGl0Tm90ZVwiLFxuICAgICAgICBcInRleHRcIiA6IHtcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwiIzAwMDAwMFwiLFxuICAgICAgICAgICAgXCJwcmVzZXRcIjogXCJCb2R5LUxcIixcbiAgICAgICAgICAgIFwiYWxpZ25tZW50XCIgOiBcImNlbnRlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFja2dyb3VuZFwiIDoge1xuICAgICAgICAgICAgXCJjb2xvclwiIDogXCJyZ2JhKDI1MSwyMzksMTcyLDEpXCIsXG4gICAgICAgICAgICBcIm9wYWNpdHlcIiA6IFwiMVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiaG92ZXJcIiA6IHtcbiAgICAgICAgICAgIFwic2VsZWN0ZWRcIiA6IHRydWUsXG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcInJnYmEoMjUxLDIyNyw5NywxKVwiLFxuICAgICAgICAgICAgXCJvcGFjaXR5XCIgOiBcIjFcIlxuICAgICAgICB9LFxuICAgICAgICBcImJvcmRlclwiIDoge1xuICAgICAgICAgICAgXCJjb2xvclwiIDogXCIjM2YzYTI2XCIsXG4gICAgICAgICAgICBcIndpZHRoXCIgOiBcIjBcIixcbiAgICAgICAgICAgIFwicmFkaXVzXCIgOiBcIjNcIlxuICAgICAgICB9XG4gICAgfSxcbiAgICBcInRyYW5zaXRpb25cIiA6IHtcbiAgICAgICAgXCJlZmZlY3RcIiA6IFwiZmFkZVwiLFxuICAgICAgICBcInByZXZpZXdcIiA6IFwiZmFsc2VcIixcbiAgICAgICAgXCJkdXJhdGlvblwiIDogXCIyXCJcbiAgICB9LFxuXG4gICAgXCJub3Rlc1wiOltdXG59O1xuXG4vKiBOb3RlIHRlbXBsYXRlIHRoYXQgbG9va3MgbGlrZSBhIGNoYWxrYm9hcmQgICovXG5leHBvcnRzLmNoYWxrYm9hcmROb3RlID0ge1xuICAgIFwiZGVzaWduXCIgOiB7XG4gICAgICAgIFwidGVtcGxhdGVcIiA6IFwiY2hhbGtib2FyZE5vdGVcIixcbiAgICAgICAgXCJ0ZXh0XCIgOiB7XG4gICAgICAgICAgICBcImNvbG9yXCIgOiBcIiNGRkZGRkZcIixcbiAgICAgICAgICAgIFwicHJlc2V0XCI6IFwiQm9keS1MXCIsXG4gICAgICAgICAgICBcImFsaWdubWVudFwiIDogXCJjZW50ZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhY2tncm91bmRcIiA6IHtcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwicmdiYSg3MiwxMDQsMzUsMSlcIixcbiAgICAgICAgICAgIFwib3BhY2l0eVwiIDogXCIxXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJob3ZlclwiIDoge1xuICAgICAgICAgICAgXCJzZWxlY3RlZFwiIDogdHJ1ZSxcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwicmdiYSg5NCwxNDEsNDgsMSlcIixcbiAgICAgICAgICAgIFwib3BhY2l0eVwiIDogXCIxXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJib3JkZXJcIiA6IHtcbiAgICAgICAgICAgIFwiY29sb3JcIiA6IFwiI0ZGRkZGRlwiLFxuICAgICAgICAgICAgXCJ3aWR0aFwiIDogXCI4XCIsXG4gICAgICAgICAgICBcInJhZGl1c1wiIDogXCI4XCJcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBcInRyYW5zaXRpb25cIiA6IHtcbiAgICAgICAgXCJlZmZlY3RcIiA6IFwiZmFkZVwiLFxuICAgICAgICBcInByZXZpZXdcIiA6IFwiZmFsc2VcIixcbiAgICAgICAgXCJkdXJhdGlvblwiIDogXCIyXCJcbiAgICB9LFxuXG4gICAgXCJub3Rlc1wiOltdXG59O1xufSx7fV0sXCIvVXNlcnMvZWxhbmFzL0Rlc2t0b3AvV2l4IFByb2plY3RzL3JvbGxpbmctbm90ZXMvcHVibGljL2phdmFzY3JpcHRzL3NldHRpbmdzLWFwcC5qc1wiOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBTZXR0aW5ncyBVSVxuICpcbiAqIEluY2x1ZGVzIGFsbCBmdW5jdGlvbmFsaXR5IGZvciBzZXR0aW5ncyBpbnRlcmZhY2UuXG4gKiBVc2VkIHRvIGN1c3RvbWl6ZS9zdHlsZSByb2xsaW5nIG5vdGVzIHdpZGdldC5cbiAqXG4gKiBVc2VzIEFuZ3VsYXIgZm9yIG1vZGVsLlxuICogQ29ycmVzcG9uZHMgdG8gdmlld3Mvc2V0dGluZ3MuZWpzLlxuICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLyogR3JhYmJpbmcgbm90ZSB0ZW1wbGF0ZXMgKi9cbnZhciB0ZW1wbGF0ZXMgPSByZXF1aXJlKFwiLi9kZWZhdWx0VGVtcGxhdGVzXCIpO1xudmFyIHNpdGVDb2xvclN0eWxlcztcblxuKGZ1bmN0aW9uKCl7XG5cbiAgICAvKlxuICAgICAqICAgSW5pdGlhbGl6aW5nIGFuZ3VsYXIgYXBwIGNhbGxlZCAnc2V0dGluZ3NBcHAnLlxuICAgICAqICAgVXNlcyB0d28gZXh0ZXJuYWwgYW5ndWxhciBsaWJyYXJpZXM6IHVpLnNvcnRhYmxlIGFuZCBuZ0FuaW1hdGVcbiAgICAgKi9cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoXCJzZXR0aW5nc0FwcFwiLCBbJ3VpLnNvcnRhYmxlJywnbmdBbmltYXRlJ10pO1xuXG4gICAgLyogSW5pdGlhbGl6aW5nIGFuZ3VsYXIgY29udHJvbGxlciB0byBiZSB1c2VkIGluIHZpZXdzL3NldHRpbmdzLmVqcyAqL1xuICAgIGFwcC5jb250cm9sbGVyKCdzZXR0aW5nc0NvbnRyb2xsZXInLCBbJyR3aW5kb3cnLCAnJHNjb3BlJywgJyRodHRwJywgJyR0aW1lb3V0JywgZnVuY3Rpb24oJHdpbmRvdywgJHNjb3BlLCAkaHR0cCwgJHRpbWVvdXQpIHtcblxuICAgICAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgICogIERlc2lnbiBTZXR0aW5ncyAoZmlyc3QgdGFiIG9mIHNldHRpbmdzKVxuICAgICAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAgICAgLyogUmVwcmVzZW50cyBKU09OIG9mIGFsbCBzZXR0aW5ncyBmb3Igbm90ZS13aWRnZXQgaW5zdGFuY2UuXG4gICAgICAgICAqIEdyYWJiZWQgZnJvbSB0aGUgZGF0YWJhc2UgdG8gaW5kZXgvcm91dGVzLmpzIHRvIHNldHRpbmdzLmVqcyB0byBoZXJlKi9cbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9ICR3aW5kb3cuc2V0dGluZ3M7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRha2VzIHRoZSB3aWRnZXQgdW5pcXVlIGlkIGFuZCBncmFicyBvbmx5IHRoZSB3aWRnZXQgY29tcG9uZW50IGlkLlxuICAgICAgICAgKiBVc2VkIHdoZW4gY29tbXVuaWNhdGluZyBmcm9tIFNldHRpbmdzIHRvIFdpZGdldC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGtleSAtIHdpZGdldCB1bmlxdWUgaWRcbiAgICAgICAgICogQHJldHVybnMgc3RyaW5nIC0gcmVwcmVzZW50cyB3aWRnZXQgY29tcG9uZW50IGlkXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgcGFyc2VDb21wSWQgPSBmdW5jdGlvbihrZXkpe1xuICAgICAgICAgICAgcmV0dXJuIGtleS5zdWJzdHJpbmcoa2V5LmluZGV4T2YoXCIuXCIpICsgMSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgYXBwIHNldHRpbmdzIGluc3RhbmNlLlxuICAgICAgICAgKiBVc2VkIHRvIHByb3Blcmx5IGF1dGhlbnRpY2F0ZSAnL3VwZGF0ZUNvbXBvbmVudCcgUE9TVCByZXF1ZXN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyBzdHJpbmcgLSBzZXR0aW5ncyBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHBhcnNlU2V0dGluZ3NJbnN0YW5jZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGluc3RhbmNlID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcod2luZG93LmxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCdpbnN0YW5jZScpICsgOSwgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5pbmRleE9mKCcmJykpO1xuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVcGRhdGVzIHRoZSBkYXRhYmFzZSBhbmQgdGhlIFdpZGdldCB3aXRoIHNldHRpbmdzIGNoYW5nZXMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBuZXdTZXR0aW5nc1xuICAgICAgICAgKi9cbiAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbXBvbmVudCA9IGZ1bmN0aW9uKG5ld1NldHRpbmdzKSB7XG4gICAgICAgICAgICAvKiByZXBsYWNpbmcgb2xkIHNldHRpbmdzIEpTT04gd2l0aCB1cGRhdGVkIHNldHRpbmdzICovXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzID0gbmV3U2V0dGluZ3M7XG5cbiAgICAgICAgICAgIC8qIFNldHMgc2V0dGluZ3MgaW5zdGFuY2UgdG8gYmUgdXNlZCBpbiBQT1NUIHJlcXVlc3QgYXV0aGVudGljYXRpb24gYmVsb3cgKi9cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaW5zdGFuY2UgPSBwYXJzZVNldHRpbmdzSW5zdGFuY2UoKTtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAqIFNlbmRzIGEgUE9TVCByZXF1ZXN0IHRvIHJvdXRlcy9pbmRleC5qcy5cbiAgICAgICAgICAgICAqIFBPU1RzIG5ldyBzZXR0aW5ncyBkYXRhIHRvIGRhdGFiYXNlLlxuICAgICAgICAgICAgICogVGhpcyBpcyBob3cgc2V0dGluZ3MgdXBkYXRlcy9jaGFuZ2VzIGFyZSBzYXZlZC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgJGh0dHAucG9zdCgnL3VwZGF0ZUNvbXBvbmVudCcsIHRoaXMuc2V0dGluZ3MpLnN1Y2Nlc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Bvc3RpbmcnKTtcbiAgICAgICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT0ggTk8hIFdFIEZBSUxFRCBUTyBQT1NUISEhISFcIik7XG4gICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGF0YTogXCIgKyBkYXRhICsgXCI7IHN0YXR1czogXCIgKyBzdGF0dXMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8qIFRyaWdnZXJzIHRoZSB3aWRnZXQgVUkgdG8gcmVmcmVzaCB3aXRoIHNldHRpbmdzIGNoYW5nZXMgKi9cbiAgICAgICAgICAgIFdpeC5TZXR0aW5ncy50cmlnZ2VyU2V0dGluZ3NVcGRhdGVkRXZlbnQoc2V0dGluZ3MsIHBhcnNlQ29tcElkKHNldHRpbmdzLl9pZCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm5zIGEgcHJlLWxvYWQgSlNPTiBiYXNlZCBvbiB0aGVcbiAgICAgICAgICogd2lkZ2V0IHRlbXBsYXRlIG5hbWUgaW4gdGhlIHBhcmFtZXRlci5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRlbXBsYXRlTmFtZSAtIG5hbWUgb2Ygd2lkZ2V0LXRlbXBsYXRlIHRvIHJldHVyblxuICAgICAgICAgKiBAcmV0dXJucyBKU09OIHJlcHJlc2VudGluZyB3aWRnZXQgdGVtcGxhdGUgc2V0dGluZ3NcbiAgICAgICAgICovXG4gICAgICAgIHZhciBnZXRUZW1wbGF0ZURlc2lnbiA9IGZ1bmN0aW9uKHRlbXBsYXRlTmFtZSkge1xuICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0ZW1wbGF0ZXNbdGVtcGxhdGVOYW1lXS5kZXNpZ24pKTtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAqIFNQRUNJQUwgQ0FTRTogJ2RlZmF1bHROb3RlJyBsb2FkcyB0byB0aGUgY29sb3Igc2NoZW1lIG9mIHRoZSBzaXRlIGl0IHdhcyBhZGRlZCB0by5cbiAgICAgICAgICAgICAqIFRoZXNlIHNldHRpbmdzIGFyZSBzYXZlZCBpbiB0aGUgdmFyaWFibGUgJ3NpdGVDb2xvclN0eWxlcycuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZU5hbWUgPT09ICdkZWZhdWx0Tm90ZScpIHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS50ZXh0LmNvbG9yID0gc2l0ZUNvbG9yU3R5bGVzLmNvbG9yO1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlLmJhY2tncm91bmQuY29sb3IgPSBzaXRlQ29sb3JTdHlsZXNbJ2JhY2tncm91bmQtY29sb3InXTtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5ib3JkZXIuY29sb3IgPSBzaXRlQ29sb3JTdHlsZXNbJ2JvcmRlci1jb2xvciddO1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlLmhvdmVyLmNvbG9yID0gc2l0ZUNvbG9yU3R5bGVzLmhvdmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIFNldHRpbmdzIFVJIHRvIHRlbXBsYXRlIHNwZWNpZmljYXRpb25zLlxuICAgICAgICAgKiBVc2VzIFdpeC5VSSB3aXRoIHdpeC1tb2RlbCB0byBjaGFuZ2UgU2V0dGluZ3MgY29tcG9uZW50cy5cbiAgICAgICAgICpcbiAgICAgICAgICogRXhhbXBsZTpcbiAgICAgICAgICogICAgICBXaXguVUkuc2V0KCd3aXgtbW9kZWwtbmFtZScsIHtrZXksIHZhbHVlfSk7XG4gICAgICAgICAqICAgICAgJ3dpeC1tb2RlbC1uYW1lJzogc2V0IGluIHNldHRpbmdzLmVqcyBmb3IgZWFjaCBXaXggVUkgY29tcG9uZW50LlxuICAgICAgICAgKiAgICAgICdrZXknOiBzcGVjaWZpYyB0byB3aGljaCBXaXggVUkgY29tcG9uZW50IGlzIGJlaW5nIHNldC5cbiAgICAgICAgICogICAgICAgICAgS2V5cyBjYW4gYmUgcmV0dXJuZWQvcHJpbnRlZCB3aXRoIFdpeC5VSS5nZXQoJ3dpeC1tb2RlbC1uYW1lJykuXG4gICAgICAgICAqICAgICAgICAgIExvb2sgYXQgV2l4IFVJIExpYiBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHRlbXBsYXRlXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgc2V0RGVzaWduT3B0aW9ucyA9IGZ1bmN0aW9uICh0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgV2l4LlVJLnNldCgnY29sb3InLCB7Y3NzQ29sb3I6IHRlbXBsYXRlLnRleHQuY29sb3J9KTtcbiAgICAgICAgICAgIFdpeC5VSS5zZXQoJ2Jjb2xvcldPcGFjaXR5Jywge3JnYmE6IHRlbXBsYXRlLmJhY2tncm91bmQuY29sb3IsIG9wYWNpdHk6dGVtcGxhdGUuYmFja2dyb3VuZC5vcGFjaXR5fSk7XG4gICAgICAgICAgICBXaXguVUkuc2V0KCdiT3BhY2l0eVNwaW5uZXInLCB0ZW1wbGF0ZS5iYWNrZ3JvdW5kLm9wYWNpdHkgKiAxMDApO1xuICAgICAgICAgICAgV2l4LlVJLnNldCgnaGNvbG9yV09wYWNpdHknLCB7cmdiYTogdGVtcGxhdGUuaG92ZXIuY29sb3IsIG9wYWNpdHk6dGVtcGxhdGUuaG92ZXIub3BhY2l0eX0pO1xuICAgICAgICAgICAgV2l4LlVJLnNldCgnaE9wYWNpdHlTbGlkZXInLCB0ZW1wbGF0ZS5ob3Zlci5vcGFjaXR5ICogMTAwKTtcbiAgICAgICAgICAgIFdpeC5VSS5zZXQoJ2JvcmRlckNvbG9yJywge2Nzc0NvbG9yOiB0ZW1wbGF0ZS5ib3JkZXIuY29sb3J9KTtcbiAgICAgICAgICAgIFdpeC5VSS5zZXQoJ2JvcmRlcldpZHRoJywgdGVtcGxhdGUuYm9yZGVyLndpZHRoKTtcbiAgICAgICAgICAgIFdpeC5VSS5zZXQoJ3JhZGl1cycsIHRlbXBsYXRlLmJvcmRlci5yYWRpdXMpO1xuICAgICAgICAgICAgV2l4LlVJLnNldCgnaG92ZXJDaGVja2JveCcsIHRlbXBsYXRlLmhvdmVyLnNlbGVjdGVkKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29ycmVzcG9uZHMgdG8gJ1Jlc2V0IERlc2lnbicgYnV0dG9uIGluIFNldHRpbmdzIFVJLlxuICAgICAgICAgKiBSZXNldHMgY2hhbmdlcyBtYWRlIGluIFNldHRpbmdzIHRvIGN1cnJlbnQgdGVtcGxhdGUncyBkZWZhdWx0cy5cbiAgICAgICAgICogUmVzZXRzIFdpZGdldFVJIGFzIHdlbGwuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlc2V0VGVtcGxhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSA9IGdldFRlbXBsYXRlRGVzaWduKHNldHRpbmdzLmRlc2lnbi50ZW1wbGF0ZSk7XG4gICAgICAgICAgICBzZXREZXNpZ25PcHRpb25zKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIHNldHRpbmdzLmRlc2lnbiA9IHRlbXBsYXRlO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbXBvbmVudChzZXR0aW5ncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoYW5nZXMgc2V0dGluZ3MgZnJvbSBvbGQgdGVtcGxhdGUgdG8gbmV3IHRlbXBsYXRlXG4gICAgICAgICAqIGtlZXBpbmcgdXNlciBjaGFuZ2VzIGluIHRhY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBuZXdTZXR0aW5ncyAtIG5ldyB0ZW1wbGF0ZSBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgYXBwbHlTZXR0aW5nc0NoYW5nZXNUb05ld1RlbXBsYXRlID0gZnVuY3Rpb24obmV3U2V0dGluZ3MpIHtcblxuICAgICAgICAgICAgLyogR2V0IGluc3RhbmNlIG9mIGZvcm1lciBkZWZhdWx0IHRlbXBsYXRlIHNldHRpbmdzICovXG4gICAgICAgICAgICB2YXIgb3JpZ2luYWxEZXNpZ24gPSBnZXRUZW1wbGF0ZURlc2lnbihzZXR0aW5ncy5kZXNpZ24udGVtcGxhdGUpO1xuXG4gICAgICAgICAgICAvKiBHZXQgaW5zdGFuY2Ugb2YgbmV3IGRlZmF1bHQgdGVtcGxhdGUgKi9cbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSA9IGdldFRlbXBsYXRlRGVzaWduKG5ld1NldHRpbmdzLnZhbHVlKTtcblxuICAgICAgICAgICAgLyogR2V0IGluc3RhbmNlIG9mIHVzZXIncyBjdXJyZW50IHRlbXBsYXRlIHNldHRpbmdzICovXG4gICAgICAgICAgICB2YXIgY3VzdG9tRGVzaWduID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzZXR0aW5ncy5kZXNpZ24pKTtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAqIEl0ZXJhdGVzIG92ZXIgYWxsIGNoYW5nZXMgYmV0d2VlbiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdmFsdWVzIGFuZCBjdXJyZW50IHVzZXIgdmFsdWVzXG4gICAgICAgICAgICAgKiB0byBkZXRlcm1pbmUgd2hlcmUgdGhlIHVzZXIgbWFkZSBjaGFuZ2VzIHRvIHRoZSBkZWZhdWx0c1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBEZWVwRGlmZi5vYnNlcnZhYmxlRGlmZihvcmlnaW5hbERlc2lnbiwgY3VzdG9tRGVzaWduLCBmdW5jdGlvbiAoZGlmZmVyZW5jZSkge1xuICAgICAgICAgICAgICAgIC8vIGFwcGx5IHRoZSBjaGFuZ2UgdG8gdGhlIG5ld2x5IHNlbGVjdGVkIHRlbXBsYXRlXG4gICAgICAgICAgICAgICAgRGVlcERpZmYuYXBwbHlDaGFuZ2UodGVtcGxhdGUsdGVtcGxhdGUsIGRpZmZlcmVuY2UpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8qIFNldHRpbmcgbmV3IHRlbXBsYXRlIGRhdGEgKi9cbiAgICAgICAgICAgIHNldERlc2lnbk9wdGlvbnModGVtcGxhdGUpO1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVzaWduID0gdGVtcGxhdGU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgICAqIEVWRU5UIExJU1RFTkVSUyBmb3IgYWxsIGNoYW5nZXMgaW4gZGVzaWduIHRhYiBvZiBzZXR0aW5ncy5cbiAgICAgICAgICogVXNlcyBXaXggVUkgTGliIGFuZCB3aXgtbW9kZWxzIHRvIGxpc3RlbiB0byBjaGFuZ2VzIGFuZFxuICAgICAgICAgKiB1cGRhdGUgc2V0dGluZ3MgZGF0YS5cbiAgICAgICAgICpcbiAgICAgICAgICogRXhhbXBsZTpcbiAgICAgICAgICogICAgICBXaXguVUkub25DaGFuZ2UoJ3dpeC1tb2RlbC1uYW1lJywgZG9Tb21ldGhpbmdXaXRoKG5ld1NldHRpbmdzKXt9KTtcbiAgICAgICAgICogICAgICAgICAgJ3dpeC1tb2RlbC1uYW1lJyAtIHNldCBpbiBzZXR0aW5ncy5lanMgZm9yIGVhY2ggV2l4IFVJIGNvbXBvbmVudFxuICAgICAgICAgKiAgICAgICAgICAgZG9Tb21ldGhpbmdXaXRoIC0gY2FsbGJhY2sgdGhhdCBkb2VzIHNvbWV0aGluZyB3aXRoIHVwZGF0ZWQgZGF0YVxuICAgICAgICAgKiAgICAgICAgICAgbmV3U2V0dGluZ3MgLSBKU09OIHJlcHJlc2VudGluZyBjaGFuZ2UgdG8gd2l4LW1vZGVsIGNvbXBvbmVudFxuICAgICAgICAgKlxuICAgICAgICAgKiBDaGFuZ2VzIGFyZSBwZXJzaXN0ZWQgdG8gV2lkZ2V0VUkgdmlhIHVwZGF0ZUNvbXBvbmVudChuZXdTZXR0aW5ncylcbiAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciB0ZW1wbGF0ZSB3aXgtbW9kZWwgY2hhbmdlcy5cbiAgICAgICAgICogQ29ycmVzcG9uZHMgdG8gdGhlIGZvdXIgdGVtcGxhdGUgb3B0aW9ucyBhdCB0aGVcbiAgICAgICAgICogdG9wIG9mIFNldHRpbmdzIERlc2lnbiB0YWIuXG4gICAgICAgICAqXG4gICAgICAgICAqIFVwZGF0ZXMgV2lkZ2V0IFVJIHRvIHRlbXBsYXRlIGNoYW5nZSB3aXRoIHVwZGF0ZUNvbXBvbmVudChuZXdTZXR0aW5ncykuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBuZXdTZXR0aW5ncyAtIG5ldyB0ZW1wbGF0ZSBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICBXaXguVUkub25DaGFuZ2UoJ3RlbXBsYXRlJywgZnVuY3Rpb24obmV3U2V0dGluZ3Mpe1xuICAgICAgICAgICAgYXBwbHlTZXR0aW5nc0NoYW5nZXNUb05ld1RlbXBsYXRlKG5ld1NldHRpbmdzKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVDb21wb25lbnQoc2V0dGluZ3MpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgbGlzdGVuZXIgZm9yIHRleHQgY29sb3IgY2hhbmdlcy5cbiAgICAgICAgICogUmVhZCBzZWN0aW9uIGhlYWRpbmcgJ0VWRU5UIExJU1RFTkVSUycgZm9yIG1vcmUgaW5mby5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5ld1NldHRpbmdzIC0gbmV3IGNvbG9yIGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIFdpeC5VSS5vbkNoYW5nZSgnY29sb3InLCBmdW5jdGlvbihuZXdTZXR0aW5ncyl7XG4gICAgICAgICAgICBzZXR0aW5ncy5kZXNpZ24udGV4dC5jb2xvciA9IG5ld1NldHRpbmdzLmNzc0NvbG9yO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbXBvbmVudChzZXR0aW5ncyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBsaXN0ZW5lciBmb3IgdGV4dC1hbGlnbiBjaGFuZ2VzLlxuICAgICAgICAgKiBSZWFkIHNlY3Rpb24gaGVhZGluZyAnRVZFTlQgTElTVEVORVJTJyBmb3IgbW9yZSBpbmZvLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbmV3U2V0dGluZ3MgLSBuZXcgdGV4dC1hbGlnbiBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICBXaXguVUkub25DaGFuZ2UoJ3RleHRBbGlnbkdyb3VwJywgZnVuY3Rpb24obmV3U2V0dGluZ3Mpe1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVzaWduLnRleHQuYWxpZ25tZW50ID0gbmV3U2V0dGluZ3MudmFsdWU7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29tcG9uZW50KHNldHRpbmdzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9UT0RPIGV4dHJhY3QgdG8gY29tbW9uIHV0aWxzLCBJJ3ZlIHNlZW4gdGhpcyBiZWZvcmVcbiAgICAgICAgdmFyIHBhcnNlUkJHQSA9IGZ1bmN0aW9uKHJnYmEpIHtcbiAgICAgICAgICAgIHJldHVybiByZ2JhLnN1YnN0cmluZyg1LCByZ2JhLmxlbmd0aC0xKS5yZXBsYWNlKC8gL2csICcnKS5zcGxpdCgnLCcpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBsaXN0ZW5lciBmb3IgYmFja2dyb3VuZCBjb2xvciBwaWNrZXIgY2hhbmdlcy5cbiAgICAgICAgICogUmVhZCBzZWN0aW9uIGhlYWRpbmcgJ0VWRU5UIExJU1RFTkVSUycgZm9yIG1vcmUgaW5mby5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5ld1NldHRpbmdzIC0gbmV3IGJhY2tncm91bmQgY29sb3IgZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgV2l4LlVJLm9uQ2hhbmdlKCdiY29sb3JXT3BhY2l0eScsIGZ1bmN0aW9uKG5ld1NldHRpbmdzKXtcbiAgICAgICAgICAgIC8qIENvbG9yIGFuZCBvcGFjaXR5IGFyZSBzYXZlZCB3aXRoIHNlcGFyYXRlIGtleXMqL1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVzaWduLmJhY2tncm91bmQuY29sb3IgPSBuZXdTZXR0aW5ncy5yZ2JhO1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVzaWduLmJhY2tncm91bmQub3BhY2l0eSA9IG5ld1NldHRpbmdzLm9wYWNpdHk7XG5cbiAgICAgICAgICAgIC8qIFVwZGF0ZXMgb3BhY2l0eSBzcGlubmVyIHdpdGggbmV3IG9wYWNpdHkgZGF0YSAqL1xuICAgICAgICAgICAgV2l4LlVJLnNldCgnYk9wYWNpdHlTcGlubmVyJywgc2V0dGluZ3MuZGVzaWduLmJhY2tncm91bmQub3BhY2l0eSAqIDEwMCk7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29tcG9uZW50KHNldHRpbmdzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciBvcGFjaXR5IHNwaW5uZXIgY2hhbmdlcy5cbiAgICAgICAgICogUmVhZCBzZWN0aW9uIGhlYWRpbmcgJ0VWRU5UIExJU1RFTkVSUycgZm9yIG1vcmUgaW5mby5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5ld1NldHRpbmdzIC0gbmV3IG9wYWNpdHkgZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgV2l4LlVJLm9uQ2hhbmdlKCdiT3BhY2l0eVNwaW5uZXInLCBmdW5jdGlvbihuZXdTZXR0aW5ncyl7XG4gICAgICAgICAgICB2YXIgY3VyclJHQkEgPSBwYXJzZVJCR0Eoc2V0dGluZ3MuZGVzaWduLmJhY2tncm91bmQuY29sb3IpO1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVzaWduLmJhY2tncm91bmQuY29sb3IgPSBcInJnYmEoXCIgKyBjdXJyUkdCQVswXSArIFwiLFwiICsgY3VyclJHQkFbMV0gKyBcIixcIiArIGN1cnJSR0JBWzJdICsgXCIsXCIgKyBuZXdTZXR0aW5ncy8xMDAgKyBcIilcIjtcbiAgICAgICAgICAgIHNldHRpbmdzLmRlc2lnbi5iYWNrZ3JvdW5kLm9wYWNpdHkgPSBuZXdTZXR0aW5ncy8xMDA7XG5cbiAgICAgICAgICAgIC8qIFVwZGF0ZXMgYmFja2dyb3VuZCBjb2xvciBwaWNrZXIgd2l0aCBuZXcgb3BhY2l0eSBkYXRhICovXG4gICAgICAgICAgICBXaXguVUkuc2V0KCdiY29sb3JXT3BhY2l0eScse3JnYmE6IHNldHRpbmdzLmRlc2lnbi5iYWNrZ3JvdW5kLmNvbG9yLCBvcGFjaXR5OnNldHRpbmdzLmRlc2lnbi5iYWNrZ3JvdW5kLm9wYWNpdHl9KTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVDb21wb25lbnQoc2V0dGluZ3MpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgbGlzdGVuZXIgZm9yIGhvdmVyIGNoZWNrYm94IGNoYW5nZXMuXG4gICAgICAgICAqIFJlYWQgc2VjdGlvbiBoZWFkaW5nICdFVkVOVCBMSVNURU5FUlMnIGZvciBtb3JlIGluZm8uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBuZXdTZXR0aW5ncyAtIG5ldyBjaGVja2JveCBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICBXaXguVUkub25DaGFuZ2UoJ2hvdmVyQ2hlY2tib3gnLCBmdW5jdGlvbihuZXdTZXR0aW5ncyl7XG4gICAgICAgICAgICBzZXR0aW5ncy5kZXNpZ24uaG92ZXIuc2VsZWN0ZWQgPSBuZXdTZXR0aW5ncztcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVDb21wb25lbnQoc2V0dGluZ3MpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgbGlzdGVuZXIgZm9yIGhvdmVyIGNvbG9yIHBpY2tlciBjaGFuZ2VzLlxuICAgICAgICAgKiBSZWFkIHNlY3Rpb24gaGVhZGluZyAnRVZFTlQgTElTVEVORVJTJyBmb3IgbW9yZSBpbmZvLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbmV3U2V0dGluZ3MgLSBuZXcgaG92ZXIgY29sb3IgZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgV2l4LlVJLm9uQ2hhbmdlKCdoY29sb3JXT3BhY2l0eScsIGZ1bmN0aW9uKG5ld1NldHRpbmdzKXtcbiAgICAgICAgICAgIC8qIEF1dG9tYXRpY2FsbHkgdG9nZ2xlcyBob3ZlciBjaGVja2JveCB0byBvbiBpZiBob3ZlciBjb2xvciBzZWxlY3RlZCAqL1xuICAgICAgICAgICAgaWYgKCFzZXR0aW5ncy5kZXNpZ24uaG92ZXIuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBXaXguVUkuc2V0KCdob3ZlckNoZWNrYm94JywgdHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIENvbG9yIGFuZCBvcGFjaXR5IHNhdmVkIGFzIHNlcGFyYXRlIHZhbHVlcyAqL1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVzaWduLmhvdmVyLmNvbG9yID0gbmV3U2V0dGluZ3MucmdiYTtcbiAgICAgICAgICAgIHNldHRpbmdzLmRlc2lnbi5ob3Zlci5vcGFjaXR5ID0gbmV3U2V0dGluZ3Mub3BhY2l0eTtcblxuICAgICAgICAgICAgLyogVXBkYXRlcyBob3ZlciBvcGFjaXR5IHNsaWRlciB0byBuZXcgb3BhY2l0eSBkYXRhICovXG4gICAgICAgICAgICBXaXguVUkuc2V0KCdoT3BhY2l0eVNsaWRlcicsIHNldHRpbmdzLmRlc2lnbi5ob3Zlci5vcGFjaXR5ICogMTAwKTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVDb21wb25lbnQoc2V0dGluZ3MpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgbGlzdGVuZXIgZm9yIGhvdmVyIG9wYWNpdHkgc2xpZGVyIGNoYW5nZXMuXG4gICAgICAgICAqIFJlYWQgc2VjdGlvbiBoZWFkaW5nICdFVkVOVCBMSVNURU5FUlMnIGZvciBtb3JlIGluZm8uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBuZXdTZXR0aW5ncyAtIG5ldyBvcGFjaXR5IGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIFdpeC5VSS5vbkNoYW5nZSgnaE9wYWNpdHlTbGlkZXInLCBmdW5jdGlvbihuZXdTZXR0aW5ncyl7XG4gICAgICAgICAgICAvKiBBdXRvbWF0aWNhbGx5IHRvZ2dsZXMgaG92ZXIgY2hlY2tib3ggdG8gb24gaWYgaG92ZXIgb3BhY2l0eSBjaGFuZ2VkICovXG4gICAgICAgICAgICBpZiAoIXNldHRpbmdzLmRlc2lnbi5ob3Zlci5zZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIFdpeC5VSS5zZXQoJ2hvdmVyQ2hlY2tib3gnLCB0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGN1cnJSR0JBID0gcGFyc2VSQkdBKHNldHRpbmdzLmRlc2lnbi5ob3Zlci5jb2xvcik7XG4gICAgICAgICAgICBzZXR0aW5ncy5kZXNpZ24uaG92ZXIuY29sb3IgPSBcInJnYmEoXCIgKyBjdXJyUkdCQVswXSArIFwiLFwiICsgY3VyclJHQkFbMV0gKyBcIixcIiArIGN1cnJSR0JBWzJdICsgXCIsXCIgKyBuZXdTZXR0aW5ncy8xMDAgKyBcIilcIjtcbiAgICAgICAgICAgIHNldHRpbmdzLmRlc2lnbi5ob3Zlci5vcGFjaXR5ID0gbmV3U2V0dGluZ3MvMTAwO1xuICAgICAgICAgICAgV2l4LlVJLnNldCgnaGNvbG9yV09wYWNpdHknLHtyZ2JhOiBzZXR0aW5ncy5kZXNpZ24uaG92ZXIuY29sb3IsIG9wYWNpdHk6c2V0dGluZ3MuZGVzaWduLmhvdmVyLm9wYWNpdHl9KTtcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVDb21wb25lbnQoc2V0dGluZ3MpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgbGlzdGVuZXIgZm9yIGJvcmRlciBjb2xvciBwaWNrZXIgY2hhbmdlcy5cbiAgICAgICAgICogUmVhZCBzZWN0aW9uIGhlYWRpbmcgJ0VWRU5UIExJU1RFTkVSUycgZm9yIG1vcmUgaW5mby5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5ld1NldHRpbmdzIC0gbmV3IGJvcmRlciBjb2xvciBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICBXaXguVUkub25DaGFuZ2UoJ2JvcmRlckNvbG9yJywgZnVuY3Rpb24obmV3U2V0dGluZ3Mpe1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVzaWduLmJvcmRlci5jb2xvciA9IG5ld1NldHRpbmdzLmNzc0NvbG9yO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbXBvbmVudChzZXR0aW5ncyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBsaXN0ZW5lciBmb3IgYm9yZGVyIHdpZHRoIHNsaWRlciBjaGFuZ2VzLlxuICAgICAgICAgKiBSZWFkIHNlY3Rpb24gaGVhZGluZyAnRVZFTlQgTElTVEVORVJTJyBmb3IgbW9yZSBpbmZvLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbmV3U2V0dGluZ3MgLSBuZXcgYm9yZGVyIHdpZHRoIGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIFdpeC5VSS5vbkNoYW5nZSgnYm9yZGVyV2lkdGgnLCBmdW5jdGlvbihuZXdTZXR0aW5ncyl7XG4gICAgICAgICAgICBzZXR0aW5ncy5kZXNpZ24uYm9yZGVyLndpZHRoID0gbmV3U2V0dGluZ3M7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29tcG9uZW50KHNldHRpbmdzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciBjb3JuZXIgcmFkaXVzIGNoYW5nZXMuXG4gICAgICAgICAqIFJlYWQgc2VjdGlvbiBoZWFkaW5nICdFVkVOVCBMSVNURU5FUlMnIGZvciBtb3JlIGluZm8uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBuZXdTZXR0aW5ncyAtIG5ldyBjb3JuZXIgcmFkaXVzIGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIFdpeC5VSS5vbkNoYW5nZSgncmFkaXVzJywgZnVuY3Rpb24obmV3U2V0dGluZ3Mpe1xuICAgICAgICAgICAgc2V0dGluZ3MuZGVzaWduLmJvcmRlci5yYWRpdXMgPSBuZXdTZXR0aW5ncztcbiAgICAgICAgICAgICRzY29wZS51cGRhdGVDb21wb25lbnQoc2V0dGluZ3MpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgKiAgTWFuYWdlIE5vdGVzIFNjcmVlblxuICAgICAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogU2hvd3MgdGhlIG1hbmFnZSBub3RlcyBzY3JlZW4uXG4gICAgICAgICAqIENvcnJlc3BvbmRzIHRvICdNYW5hZ2UgTm90ZXMnIGJ1dHRvbiBpbiBTZXR0aW5ncy5cbiAgICAgICAgICpcbiAgICAgICAgICogVXNlcyBhbmd1bGFyJ3Mgbmctc2hvdy9oaWRlIHZpYSAkc2NvcGUudmlzaWJsZU1hbmFnZU5vdGVzIGJvb2xlYW4uXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUudmlzaWJsZU1hbmFnZU5vdGVzID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc2hvd01hbmFnZU5vdGVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvKiBTZXQgdG8gdHJ1ZSB3aGVuIG1hbmFnZSBub3RlcyBzY3JlZW4gc2hvdWxkIGJlIHZpc2libGUgKi9cbiAgICAgICAgICAgICRzY29wZS52aXNpYmxlTWFuYWdlTm90ZXMgPSB0cnVlO1xuXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICogSlF1ZXJ5IG5lZWRlZCB0byByZW1vdmUgbWF4LWNoYXJhY3RlciBub3RpZmljYXRpb24gd2hlbiB0aGVcbiAgICAgICAgICAgICAqIHVzZXIgcmVvcGVucyB0aGUgc2V0dGluZ3MgcGFuZWwuIFRoaXMgaXMgYSBwZXJzb25hbFxuICAgICAgICAgICAgICogZGVzaWduIHByZWZlcmVuY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgJCgnLmNoYXJhY3Rlci1jb3VudC1ub3JtYWwnKS5yZW1vdmVDbGFzcygnY2hhcmFjdGVyLWNvdW50LW1heCcpO1xuICAgICAgICAgICAgJCgndGV4dGFyZWEnKS5yZW1vdmVDbGFzcygnbm90ZS10ZXh0LW1heC1jb3VudCcpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIaWRlcyB0aGUgbWFuYWdlIG5vdGVzIHNjcmVlbi5cbiAgICAgICAgICogQ29ycmVzcG9uZHMgdG8gJ0JhY2sgdG8gU2V0dGluZ3MnIGJ1dHRvbiBpbiBtYW5hZ2Ugbm90ZXMgc2NyZWVuLlxuICAgICAgICAgKlxuICAgICAgICAgKiBVc2VzIGFuZ3VsYXIncyBuZy1zaG93L2hpZGUgdmlhICRzY29wZS52aXNpYmxlTWFuYWdlTm90ZXMgYm9vbGVhbi5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaGlkZU1hbmFnZU5vdGVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvKiBTZXQgdG8gZmFsc2Ugd2hlbiBtYW5hZ2Ugbm90ZXMgc2NyZWVuIHNob3VsZCBiZSBoaWRkZW4gKi9cbiAgICAgICAgICAgICRzY29wZS52aXNpYmxlTWFuYWdlTm90ZXMgPSBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVXBkYXRlcyBkYXRhYmFzZSBhbmQgV2lkZ2V0IHVwb24gdGV4dGFyZWEgYmx1ci5cbiAgICAgICAgICogU2F2ZXMgbmV3IHRleHQsIGRpc3BsYXlzIGluIHdpZGdldC5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYmx1ciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAqIEpRdWVyeSBuZWVkZWQgdG8gcmVtb3ZlIG1heC1jaGFyYWN0ZXIgbm90aWZpY2F0aW9uIHdoZW4gdGhlXG4gICAgICAgICAgICAgKiB1c2VyIGJsdXJzIGF3YXkgZnJvbSBhIHRleHRhcmVhLiBUaGlzIGlzIGEgcGVyc29uYWxcbiAgICAgICAgICAgICAqIGRlc2lnbiBwcmVmZXJlbmNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICAkKCcuY2hhcmFjdGVyLWNvdW50LW5vcm1hbCcpLnJlbW92ZUNsYXNzKCdjaGFyYWN0ZXItY291bnQtbWF4Jyk7XG4gICAgICAgICAgICAkKCd0ZXh0YXJlYScpLnJlbW92ZUNsYXNzKCdub3RlLXRleHQtbWF4LWNvdW50Jyk7XG5cbiAgICAgICAgICAgICRzY29wZS51cGRhdGVDb21wb25lbnQoc2V0dGluZ3MpO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgLyogU1BFQ0lBTCBDQVNFOiAkc2NvcGUuc2V0dGluZ3MgbmVlZGVkIGZvciAkd2F0Y2hDb2xsZWN0aW9uIGJlbG93LiBOb3doZXJlIGVsc2UuKi9cbiAgICAgICAgJHNjb3BlLnNldHRpbmdzID0gJHdpbmRvdy5zZXR0aW5ncztcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2F0Y2hlcyBmb3IgYW55IGNoYW5nZXMgaW4gdGhlICdzZXR0aW5ncy5ub3RlcycgYXJyYXkuXG4gICAgICAgICAqIEkuZS4gbm90ZXMgdGhhdCBhcmUgYWRkZWQsIGRlbGV0ZWQsIG9yIHN3YXBwZWQgcGxhY2VzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBTYXZlcyB0aGUgY2hhbmdlcyB3aXRoIHVwZGF0ZUNvbXBvbmVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtICdzZXR0aW5ncy5ub3RlJyAtIGNvbGxlY3Rpb24gdG8gYmUgd2F0Y2hlZFxuICAgICAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBkbyBzb21ldGhpbmcgd2hlbiBjaGFuZ2UgZGV0ZWN0ZWRcbiAgICAgICAgICovXG4gICAgICAgICRzY29wZS4kd2F0Y2hDb2xsZWN0aW9uKCdzZXR0aW5ncy5ub3RlcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbXBvbmVudChzZXR0aW5ncyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGRzIGEgbmV3IG5vdGUgdG8gbWFuYWdlIG5vdGVzIHNjcmVlbi5cbiAgICAgICAgICogQ29ycmVzcG9uZHMgdG8gJ0FkZCBhIG5vdGUnIGJ1dHRvbi5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYWRkTm90ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgKiBQdXNoZXMgYSBuZXcgbm90ZSwgd2l0aCBkZWZhdWx0IHNldHRpbmdzLCB0byBzZXR0aW5ncy5ub3RlcyBhcnJheS5cbiAgICAgICAgICAgICAqIEF1dG9tYXRpY2FsbHkgdXBkYXRlcyBNYW5hZ2UgTm90ZXMgVUkgdmlhIGFuZ3VsYXIgd2F0Y2ggZnVuY3Rpb24uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNldHRpbmdzLm5vdGVzLnB1c2goe1widmlzaWJpbGl0eVwiIDogdHJ1ZSwgXCJtc2dcIiA6IFwiXCIsIGtleSA6IHVuaXF1ZU5vdGVLZXkoKSxcbiAgICAgICAgICAgICAgICBsaW5rOnt0eXBlOlwiXCIsdXJsOlwiXCIsZGlzcGxheTpcIlwiLCB0YXJnZXRWYWw6XCIwXCJ9fSk7XG5cbiAgICAgICAgICAgIC8qIEF1dG9mb2N1c2VzIG5ld2x5IGFkZGVkIG5vdGUgKi9cbiAgICAgICAgICAgIGZvY3VzTmV3Tm90ZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm5zIGEgdW5pcXVlIGtleSBpZCB0byBiZSBhc3NpZ25lZCB0byBlYWNoIG5vdGUgYXMgdGhleSBhcmUgYWRkZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIE5lZWRlZCBpbiBvcmRlciB0byBwcm9wZXJseSB0cmFuc2l0aW9uIG5vdGVzIGluXG4gICAgICAgICAqIFByZXZpZXcgYW5kIFB1Ymxpc2guICBUaGlzIHVuaXF1ZSBrZXkgaXMgaG93IHRoZVxuICAgICAgICAgKiBSZWFjdENTU1RyYW5zaXRpb25zIGtlZXAgdHJhY2sgb2Ygd2hpY2ggbm90ZSBpc1xuICAgICAgICAgKiB0cmFuc2l0aW9uIGluIGFuZCB3aGljaCBub3RlIGlzIHRyYW5pdGlvbiBvdXQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHN0cmluZyAtIHVuaXF1ZSBrZXkgaWRcbiAgICAgICAgICovXG4gICAgICAgIHZhciB1bmlxdWVOb3RlS2V5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIga2V5O1xuICAgICAgICAgICAgZnVuY3Rpb24gczQoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXG4gICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygxNilcbiAgICAgICAgICAgICAgICAgICAgLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtleSA9IChzNCgpICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICtcbiAgICAgICAgICAgICAgICBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpKTtcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEF1dG9mb2N1c2VzIG5ldyBub3RlJ3MgdGV4dGFyZWEgd2hlbiBpdCBpcyBhZGRlZCB0byBtYW5hZ2Ugbm90ZXMgc2NyZWVuLlxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGZvY3VzTmV3Tm90ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8qIFVzZXMgYSB0aW1lb3V0IHRvIGNvbmZpcm0gZnVuY3Rpb24gcnVucyBhZnRlciBuZXcgbm90ZSBpcyBhZGRlZCAmIHNhdmVkICovXG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJyYXkgPSAkKFwidGV4dGFyZWFcIik7XG4gICAgICAgICAgICAgICAgdmFyIGVsID0gJChhcnJheVthcnJheS5sZW5ndGgtMV0pO1xuICAgICAgICAgICAgICAgIGVsLmZvY3VzKCk7XG4gICAgICAgICAgICB9LDApO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZvY3VzZXMgdGhlIHRleHRhcmVhIG9mIHNwZWNpZmllZCBub3RlIHRleHRhcmVhLlxuICAgICAgICAgKiBDb3JyZXNwb25kcyB0byBlZGl0LWJ1dHRvbiBvbiByaWdodCBvZiBub3RlIGluIG1hbmFnZSBub3RlcyBzY3JlZW4uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBlIC0gZWxlbWVudCB0byBmb2N1c1xuICAgICAgICAgKiBAcGFyYW0gaW5kZXggLSBpbmRleCBpbiBzZXR0aW5ncy5ub3RlcyBhcnJheSBvZiBzcGVjaWZpZWQgbm90ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lZGl0Tm90ZUJ1dHRvbiA9IGZ1bmN0aW9uKGUsIGluZGV4KSB7XG4gICAgICAgICAgICAvKiBDaGVja3MgdG8gbWFrZSBzdXJlIG5vdGUgdmlzaWJpbGl0eSBpcyB0cnVlLiBEb24ndCB3YW50IHRvIGZvY3VzIGhpZGRlbiBub3RlLiAqL1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3Mubm90ZXNbaW5kZXhdLnZpc2liaWxpdHkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvY3VzVGV4dChlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQmx1cnMgYXdheSBmcm9tIGN1cnJlbnQgZm9jdXNlZCB0ZXh0YXJlYSBhbmQgZm9jdXNlc1xuICAgICAgICAgKiBvbiB0aGUgbmV3bHkgY2xpY2tlZCB0ZXh0YXJlYS5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBmdW5jdGlvbiBpcyBuZWVkZWQgdG8gc2F2ZSBjaGFuZ2VzIG1hZGUgaW4gdGhlXG4gICAgICAgICAqIGZvcm1lcmx5IGZvY3VzZWQgdGV4dGFyZWEgYmVmb3JlIGZvY3VzaW5nIG9uIGEgbmV3IG9uZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGVsZW1lbnQgLSB0ZXh0YXJlYSB0byBmb2N1c1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5mb2N1c1RleHQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgLyogVXNlcyBhIHRpbWVvdXQgdG8gY29uZmlybSBmdW5jdGlvbiBydW5zIGFmdGVyIG5ldyBub3RlIGlzIGFkZGVkICYgc2F2ZWQgKi9cbiAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghKCQoXCJ0ZXh0YXJlYTpmb2N1c1wiKSkgKSB7XG4gICAgICAgICAgICAgICAgICAgICQoXCJ0ZXh0YXJlYTpmb2N1c1wiKS5ibHVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZWxlbWVudC50YXJnZXQpLmNsb3Nlc3QoJy5ub3RlLWNvbnRhaW5lcicpLmZpbmQoJ3RleHRhcmVhJykuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sIDAsIGZhbHNlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyBub3RlIHNldHRpbmdzLm5vdGVzIGFycmF5LlxuICAgICAgICAgKiBUaGUgd2F0Y2hDb2xsZWN0aW9uIGZ1bmN0aW9uIGVuc3VyZXMgbm90ZSByZW1vdmVkIGZyb20gTWFuYWdlIE5vdGVzIHNjcmVlbiBhcyB3ZWxsLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbm90ZXMgLSBhcnJheSBvZiBub3Rlc1xuICAgICAgICAgKiBAcGFyYW0gaW5kZXggLSBpbmRleCBvZiBub3RlIHRvIGJlIHJlbW92ZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVsZXRlTm90ZSA9IGZ1bmN0aW9uKG5vdGVzLCBpbmRleCkge1xuICAgICAgICAgICAgbm90ZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVmFyaWFibGVzIHVzZWQgaW4gc2V0dGluZ3MuZWpzIHdpdGggYW5ndWxhcidzIG5nLXNob3cvaGlkZVxuICAgICAgICAgKiB0byBzaG93IG5vdGUtaWNvbnMgb24gaG92ZXIuXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUuaGlkZGVuTm90ZSA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc2hvd0ljb25zID0gZmFsc2U7XG5cbiAgICAgICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgICogIFRyYW5zaXRpb24gU2V0dGluZ3MgKHNlY29uZCB0YWIgb2Ygc2V0dGluZ3MpXG4gICAgICAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cbiAgICAgICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgICAqIEVWRU5UIExJU1RFTkVSUyBmb3IgYWxsIGNoYW5nZXMgaW4gdHJhbnNpdGlvbiB0YWIgb2Ygc2V0dGluZ3MuXG4gICAgICAgICAqIFVzZXMgV2l4IFVJIExpYiBhbmQgd2l4LW1vZGVscyB0byBsaXN0ZW4gdG8gY2hhbmdlcyBhbmRcbiAgICAgICAgICogdXBkYXRlIHNldHRpbmdzIGRhdGEuXG4gICAgICAgICAqXG4gICAgICAgICAqIEV4YW1wbGU6XG4gICAgICAgICAqICAgICAgV2l4LlVJLm9uQ2hhbmdlKCd3aXgtbW9kZWwtbmFtZScsIGRvU29tZXRoaW5nV2l0aChuZXdTZXR0aW5ncyl7fSk7XG4gICAgICAgICAqICAgICAgICAgICd3aXgtbW9kZWwtbmFtZScgLSBzZXQgaW4gc2V0dGluZ3MuZWpzIGZvciBlYWNoIFdpeCBVSSBjb21wb25lbnRcbiAgICAgICAgICogICAgICAgICAgIGRvU29tZXRoaW5nV2l0aCAtIGNhbGxiYWNrIHRoYXQgZG9lcyBzb21ldGhpbmcgd2l0aCB1cGRhdGVkIGRhdGFcbiAgICAgICAgICogICAgICAgICAgIG5ld1NldHRpbmdzIC0gSlNPTiByZXByZXNlbnRpbmcgY2hhbmdlIHRvIHdpeC1tb2RlbCBjb21wb25lbnRcbiAgICAgICAgICpcbiAgICAgICAgICogQ2hhbmdlcyBhcmUgcGVyc2lzdGVkIHRvIFdpZGdldFVJIHZpYSB1cGRhdGVDb21wb25lbnQobmV3U2V0dGluZ3MpXG4gICAgICAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBsaXN0ZW5lciBmb3IgdHJhbnNpdGlvbiB3aXgtbW9kZWwgY2hhbmdlcy5cbiAgICAgICAgICogQ29ycmVzcG9uZHMgdG8gdGhlIGZvdXIgdHJhbnNpdGlvbiBvcHRpb25zIGF0IHRoZVxuICAgICAgICAgKiB0b3Agb2YgU2V0dGluZ3MgVHJhbnNpdGlvbiB0YWIuXG4gICAgICAgICAqXG4gICAgICAgICAqIFBsYXlzIGEgcHJldmlldyBvZiB0aGUgc2VsZWN0ZWQgdHJhbnNpdGlvbiBvbiBjbGljay5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5ld1NldHRpbmdzIC0gbmV3IHRyYW5zaXRpb24gZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBXaXguVUkub25DaGFuZ2UoJ3RyYW5zaXRpb24nLCBmdW5jdGlvbihuZXdTZXR0aW5ncyl7XG4gICAgICAgICAgICBzZXR0aW5ncy50cmFuc2l0aW9uLmVmZmVjdCA9IG5ld1NldHRpbmdzLnZhbHVlO1xuICAgICAgICAgICAgdGhhdC5wbGF5UHJldmlldygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgbGlzdGVuZXIgZm9yIHRyYW5zaXRpb24gZHVyYXRpb24gd2l4LW1vZGVsIGNoYW5nZXMuXG4gICAgICAgICAqIENvcnJlc3BvbmRzIHRvIHRoZSBkdXJhdGlvbiBzbGlkZXIgaW4gdHJhbnNpdGlvbiB0YWIuXG4gICAgICAgICAqXG4gICAgICAgICAqIFVwZGF0ZXMgV2lkZ2V0IFVJIHRvIGR1cmF0aW9uIGNoYW5nZXMgd2l0aCB1cGRhdGVDb21wb25lbnQobmV3U2V0dGluZ3MpLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbmV3U2V0dGluZ3MgLSBuZXcgZHVyYXRpb24gc2xpZGVyIGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIFdpeC5VSS5vbkNoYW5nZSgnZHVyYXRpb24nLCBmdW5jdGlvbihuZXdTZXR0aW5ncyl7XG4gICAgICAgICAgICBzZXR0aW5ncy50cmFuc2l0aW9uLmR1cmF0aW9uID0gTWF0aC5yb3VuZChuZXdTZXR0aW5ncyk7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29tcG9uZW50KHNldHRpbmdzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlcGxheXMgcHJldmlldyB3aGVuIHRyYW5zaXRpb24gb3B0aW9uIGlzIHJlLWNsaWNrZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucGxheVByZXZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8qIFNldHMgcHJldmlldyB0byB0cnVlIGluIG9yZGVyIHRvIHByZXZpZXcgbm90ZSBpbiBXaWRnZXRVSS5cbiAgICAgICAgICAgICAqIFNldHMgcHJldmlldyBiYWNrIHRvIGZhbHNlIHRvIHN0b3AgcGxheWluZyBub3RlcyBvbmNlIHByZXZpZXcgaXMgZmluaXNoZWQgKi9cbiAgICAgICAgICAgIHNldHRpbmdzLnRyYW5zaXRpb24ucHJldmlldyA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29tcG9uZW50KHNldHRpbmdzKTtcbiAgICAgICAgICAgIHNldHRpbmdzLnRyYW5zaXRpb24ucHJldmlldyA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgICogIEFkZCBMaW5rIFBvcHVwIGRpYWxvZyBib3hcbiAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogU2NvcGVkIHZhcmlhYmxlcyB1c2VkIHdpdGggYW5ndWxhciBkaXJlY3RpdmVzXG4gICAgICAgICAqIHRvIGRpc3BsYXkgbGluayBwb3B1cCBhbmQgaXRzIGNvbXBvbmVudHMuXG4gICAgICAgICAqL1xuICAgICAgICAkc2NvcGUucG9wdXBWaXNpYmxlID0gZmFsc2U7XG4gICAgICAgICRzY29wZS51cHBlclRleHRWaXNpYmxlID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5idXR0b25zVmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUub3B0aW9uc1Zpc2libGUgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmxpbmtPcHRpb24gPSAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTaG93cyBsaW5rIHBvcHVwLlxuICAgICAgICAgKiBDb3JyZXNwb25kcyB0byB0aGUgJ0FkZCBhIExpbmsnIGJ1dHRvbiBhdCB0aGUgYm90dG9tIG9mIGVhY2ggbm90ZSBvbiBob3Zlci5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5vdGUgLSBub3RlIHRoZSBhZGRlZCBsaW5rIGNvcnJlc3BvbmRzIHRvXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNob3dMaW5rUG9wdXAgPSBmdW5jdGlvbihub3RlKSB7XG4gICAgICAgICAgICB0aGlzLm5vdGVGb3JMaW5rID0gbm90ZTtcblxuICAgICAgICAgICAgLyogVGhlc2UgY2hhbmdlcyB0cmlnZ2VyIGFuZ3VsYXIgZGlyZWN0aXZlcyB0byBzaG93XG4gICAgICAgICAgICAgKiBhbmQgaGlkZSB2YXJpb3VzIEhUTUwgRG9tIGVsZW1lbnRzIGFjY29yZGluZ2x5ICovXG4gICAgICAgICAgICAkc2NvcGUucG9wdXBWaXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5idXR0b25zVmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUubGlua09wdGlvbiA9IDA7XG5cbiAgICAgICAgICAgIC8qIExvYWRpbmcgYW4gYXJyYXkgb2YgdGhlIHVzZXIncyBzaXRlIHBhZ2VzLiBVc2VkIGlmIHRoZSB1c2VyIHdhbnRzIHRvIGFkZCBhIHNpdGUgbGluay4gKi9cbiAgICAgICAgICAgIGxvYWRQYWdlRHJvcGRvd24oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2hvd3MgdGhlIHNwZWNpZmllZCBsaW5rIG9wdGlvbi5cbiAgICAgICAgICogQ29ycmVzcG9uZHMgdG8gd2hpY2ggYnV0dG9uIHRoZSB1c2VyIHBpY2tzIGluIHRoZSBsaW5rIHBvcHVwLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gdHlwZSAtIHdoaWNoIGxpbmsgb3B0aW9uIHRvIHNob3dcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2hvd0xpbmsgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICAvKiBUaGVzZSBjaGFuZ2VzIHRyaWdnZXIgYW5ndWxhciBkaXJlY3RpdmVzIHRvIHNob3dcbiAgICAgICAgICAgICAqIGFuZCBoaWRlIHZhcmlvdXMgSFRNTCBEb20gZWxlbWVudHMgYWNjb3JkaW5nbHkgKi9cbiAgICAgICAgICAgICRzY29wZS5idXR0b25zVmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnNWaXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5saW5rT3B0aW9uID0gdHlwZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2xvc2VzIHRoZSBsaW5rIHBvcHVwIGRpYWxvZy5cbiAgICAgICAgICpcbiAgICAgICAgICogVXNlcyBhbmd1bGFyIHNjb3BlZCB2YXJpYWJsZXMgYW5kIGRpcmVjdGl2ZXMgdG8gaGlkZSBIVE1MIGVsZW1lbnRzLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jbG9zZUxpbmtQb3B1cCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkc2NvcGUucG9wdXBWaXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUudXBwZXJUZXh0VmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmJ1dHRvbnNWaXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc1Zpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5saW5rT3B0aW9uID0gMDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2F2ZXMgYW5kIGNvbnN0cnVjdHMgdGhlIHNlbGVjdGVkIGxpbmsgYW5kIGNvbm5lY3RzIGl0IHRvIHRoZSBub3RlIGl0IHdhcyBhZGRlZCB0by5cbiAgICAgICAgICogQ29ycmVzcG9uZHMgdG8gdGhlICdPSycgYnV0dG9uIGluIHRoZSBsaW5rIHBvcHVwLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXRMaW5rID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvKiBTYXZlcyB0aGUgbGluayB1cmwgdGhhdCB3YXMgY3JlYXRlZCBieSB0aGUgdXNlciAqL1xuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnMgPSB7MSA6ICd3ZWJMaW5rJywgMjogJ3BhZ2VMaW5rJywgMzogJ2VtYWlsTGluaycsIDQ6ICdkb2NMaW5rJ307XG4gICAgICAgICAgICB2YXIgY2hvc2VuTGluayA9ICRzY29wZS5vcHRpb25zWyRzY29wZS5saW5rT3B0aW9uXTtcbiAgICAgICAgICAgIHZhciBsaW5rID0gdGhpcy5ub3RlRm9yTGlua1tjaG9zZW5MaW5rXTtcblxuICAgICAgICAgICAgLyogUmVzZXRzIHRoZSBvdGhlciBsaW5rcyBiYWNrIHRvIGJsYW5rIHN0cmluZ3MgKi9cbiAgICAgICAgICAgIGNsZWFyTGlua3ModGhpcy5ub3RlRm9yTGluayk7XG5cblxuXG5cbiAgICAgICAgICAgIC8qIFNldHMgbm90ZSB0byBjaG9zZW4gbGluayBhbmQgdXJsICovXG4gICAgICAgICAgICB0aGlzLm5vdGVGb3JMaW5rW2Nob3NlbkxpbmtdID0gbGluaztcbiAgICAgICAgICAgIHRoaXMubm90ZUZvckxpbmsubGluay51cmwgPSBsaW5rO1xuXG4gICAgICAgICAgICAvKiBFYWNoIHR5cGUgb2YgbGluayByZXF1aXJlIGRpZmZlcmVudCBjb25zdHJ1Y3Rpb24gKi9cbiAgICAgICAgICAgIC8qIGxpbmsuZGlzcGxheSBpcyB3aGF0IGlzIHNlZW4gYnkgdGhlIHVzZXIgYWZ0ZXIgdGhlIGxpbmsgaXMgYWRkZWQgKi9cbiAgICAgICAgICAgIC8qIGxpbmsudXJsIGlzIHdoYXQgaXMgcHV0IGluIHRoZSBocmVmICovXG4gICAgICAgICAgICBzd2l0Y2goJHNjb3BlLmxpbmtPcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6IC8vd2ViLWxpbmtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm90ZUZvckxpbmsubGluay5kaXNwbGF5ID0gbGluaztcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RhcmdldFZhbDogJyArIHRoaXMubm90ZUZvckxpbmsubGluay50YXJnZXRWYWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5ub3RlRm9yTGluay5saW5rLnRhcmdldFZhbCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5vdGVGb3JMaW5rLmxpbmsudGFyZ2V0ID0gJ190b3AnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RlRm9yTGluay5saW5rLnRhcmdldCA9ICdfYmxhbmsnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUYXJnZXQ6ICcgKyB0aGlzLm5vdGVGb3JMaW5rLmxpbmsudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgMjogLy9wYWdlLWxpbmtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gJHNjb3BlO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHNldHRpbmdzLnBhZ2VzLmluZGV4T2YodGhpcy5ub3RlRm9yTGluay5wYWdlTGluayk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm90ZUZvckxpbmsubGluay5kaXNwbGF5ID0gbGluaztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RlRm9yTGluay5saW5rLnRhcmdldCA9ICdfdG9wJztcblxuICAgICAgICAgICAgICAgICAgICAvKiBHcmFiYmluZyBhbmQgY29udHJ1Y3RpbmcgcGFnZS1saW5rIHVybCBmcm9tIFdpeCBzaXRlICovXG4gICAgICAgICAgICAgICAgICAgIFdpeC5Xb3JrZXIuZ2V0U2l0ZUluZm8oZnVuY3Rpb24gKHNpdGVJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Lm5vdGVGb3JMaW5rLmxpbmsudXJsID0gc2l0ZUluZm8uYmFzZVVybCArICcjIS8nICsgdGhhdC5zZXR0aW5ncy5wYWdlSWRzW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnVwZGF0ZUNvbXBvbmVudCh0aGF0LnNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIDM6IC8vZW1haWwtbGlua1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RlRm9yTGluay5saW5rLnVybCA9IG1haWxMaW5rKHRoaXMubm90ZUZvckxpbmsuZW1haWxMaW5rLHtzdWJqZWN0OiB0aGlzLm5vdGVGb3JMaW5rLmxpbmsuc3ViamVjdH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vdGVGb3JMaW5rLmxpbmsuZGlzcGxheSA9IFwibWFpbCB0bzogXCIgKyB0aGlzLm5vdGVGb3JMaW5rLmVtYWlsTGluaztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RlRm9yTGluay5saW5rLnRhcmdldCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSA0OiAvL2RvYy1saW5rXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vdGVGb3JMaW5rLmxpbmsudGFyZ2V0ID0gJ19ibGFuayc7XG5cbiAgICAgICAgICAgICAgICAgICAgLyogVGhpcyBhbGxvd3MgdGhlIFdpZGdldCB0byBrbm93IGlmIGl0IHNob3VsZCBncmFiIHRoZSBzdGF0aWMgV2l4XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmwgZnJvbSB0aGUgcmVsYXRpdmUgVXJpIHByb3ZpZGVkIHRocm91Z2ggaXRzIG1lZGlhIHVwbG9hZCBkaWFsb2cuICovXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm90ZUZvckxpbmsubGluay5kb2MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qIEN1dHMgdGhlIGRpc3BsYXkgbGluayB0byBvbmx5IDMwIGNoYXJhY3RlcnMgZm9yIGFlc3RoZXRpY3MgKi9cbiAgICAgICAgICAgIHRoaXMubm90ZUZvckxpbmsubGluay5kaXNwbGF5ID0gdGhpcy5ub3RlRm9yTGluay5saW5rLmRpc3BsYXkuc3Vic3RyaW5nKDAsIDMwKTtcblxuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbXBvbmVudChzZXR0aW5ncyk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlTGlua1BvcHVwKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgdG8gTGluayBvcHRpb25zIGluIHBvcHVwLlxuICAgICAgICAgKiBDb3JyZXNwb25kcyB0byAnQmFjayB0byBsaW5rIG9wdGlvbnMnIGJ1dHRvbiBpbiBsaW5rIHBvcHVwLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5iYWNrVG9PcHRpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9uc1Zpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5idXR0b25zVmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUubGlua09wdGlvbiA9IDA7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlc2V0cyBsaW5rIGRhdGEgdG8gYmxhbmsgc3RyaW5nLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbm90ZSAtIHRoZSBub3RlIHRoZSBsaW5rIGNvcnJlc3BvbmRzIHRvXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgY2xlYXJMaW5rcyA9IGZ1bmN0aW9uKG5vdGUpIHtcbiAgICAgICAgICAgIG5vdGUud2ViTGluayA9IFwiXCI7XG4gICAgICAgICAgICBub3RlLnBhZ2VMaW5rID0gXCJcIjtcbiAgICAgICAgICAgIG5vdGUuZW1haWxMaW5rID0gXCJcIjtcbiAgICAgICAgICAgIG5vdGUuZG9jTGluayA9IFwiXCI7XG4gICAgICAgICAgICBub3RlLmxpbmsuZG9jID0gZmFsc2U7XG4gICAgICAgICAgICBub3RlLmxpbmsuc3ViamVjdCA9IFwiXCI7XG4gICAgICAgICAgICBub3RlLmxpbmsudXJsID0gXCJcIjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYXJzIHRoZSBsaW5rIHdoaWxlIGFsc28gY2xlYXJpbmcgdGhlIGxpbmstZGlzcGxheSBvbiB0aGUgbm90ZSBpdHNlbGYuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBub3RlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlbW92ZUxpbmsgPSBmdW5jdGlvbihub3RlKSB7XG4gICAgICAgICAgICBjbGVhckxpbmtzKG5vdGUpO1xuICAgICAgICAgICAgbm90ZS5saW5rLmRpc3BsYXkgPSBcIlwiO1xuICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZUNvbXBvbmVudChzZXR0aW5ncyk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlTGlua1BvcHVwKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIExvYWRzIHRoZSB1c2VyJ3Mgc2l0ZSBwYWdlcyBmb3IgcGlja2luZyBhIHBhZ2UgbGluay5cbiAgICAgICAgICovXG4gICAgICAgIHZhciBsb2FkUGFnZURyb3Bkb3duID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBXaXguZ2V0U2l0ZVBhZ2VzKGZ1bmN0aW9uIChzaXRlUGFnZXMpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5wYWdlcyA9IF8ucGx1Y2soc2l0ZVBhZ2VzLCAndGl0bGUnKTtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5wYWdlSWRzID0gXy5wbHVjayhzaXRlUGFnZXMsICdpZCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnN0cnVjdHMgYSBtYWlsLXRvIHVybCBmb3IgaWYgdGhlIHVzZXIgd2FudHMgdG9cbiAgICAgICAgICogYW5kIGFuIGVtYWlsLWxpbmsgZnJvbSBsaW5rIHBvcHVwLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gcmVjZXBpZW50XG4gICAgICAgICAqIEBwYXJhbSBvcHRzXG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgbWFpbExpbmsgPSBmdW5jdGlvbihyZWNlcGllbnQsIG9wdHMpIHtcbiAgICAgICAgICAgIHZhciBsaW5rID0gXCJtYWlsdG86XCI7XG4gICAgICAgICAgICBsaW5rICs9IHdpbmRvdy5lbmNvZGVVUklDb21wb25lbnQocmVjZXBpZW50KTtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSBbXTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChvcHRzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2goa2V5LnRvTG93ZXJDYXNlKCkgKyBcIj1cIiArIHdpbmRvdy5lbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbGluayArPSBcIj9cIiArIHBhcmFtcy5qb2luKFwiJlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBsaW5rO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBPcGVucyB1cCBXaXgncyBkb2N1bWVudCB1cGxvYWQgcG9wdXAuXG4gICAgICAgICAqIENvbmZpZ3VyZXMgdGhlIGF0dGFjaG1lbnQncyB1cmwgYW5kIHNhdmVzXG4gICAgICAgICAqIHRoZSB1cmwgYW5kIGRpc3BsYXkgZGF0YS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZG9jTGluayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHNjb3BlID0gJHNjb3BlO1xuXG4gICAgICAgICAgICAvKiBPcGVucyBXaXgncyBkb2N1bWVudCB1cGxhb2QgZGlhbG9nICovXG4gICAgICAgICAgICBXaXguU2V0dGluZ3Mub3Blbk1lZGlhRGlhbG9nKCBXaXguU2V0dGluZ3MuTWVkaWFUeXBlLkRPQ1VNRU5ULCBmYWxzZSwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBkb2N1bWVudFVybCA9IFdpeC5VdGlscy5NZWRpYS5nZXREb2N1bWVudFVybChkYXRhLnJlbGF0aXZlVXJpKTtcbi8vICAgICAgICAgICAgICAgIHRoYXQubm90ZUZvckxpbmsuZG9jTGluayA9IGRvY3VtZW50VXJsO1xuICAgICAgICAgICAgICAgIHRoYXQubm90ZUZvckxpbmsuZG9jTGluayA9IGRhdGEucmVsYXRpdmVVcmk7XG5cbiAgICAgICAgICAgICAgICAvKiBTUEVDSUFMIENBU0U6IE5lZWRlZCBieSBBbmd1bGFyIHRvIGRldGVjdCB3aGVuIHZhcmlhYmxlcyBhcmUgY2hhbmdlZFxuICAgICAgICAgICAgICAgICogdG8gdXBkYXRlIGltbWVkaWF0ZWx5ICovXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQubm90ZUZvckxpbmsubGluay5kaXNwbGF5ID0gZGF0YS5maWxlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5ub3RlRm9yTGluay5saW5rLmRpc3BsYXkgPSB0aGF0Lm5vdGVGb3JMaW5rLmxpbmsuZGlzcGxheS5zdWJzdHJpbmcoMCwgMzApO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51cGRhdGVDb21wb25lbnQoc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNQRUNJQUwgQ0FTRTogQ3JlYXRlcyBhIGN1c3RvbSBIVE1MIHRhZyB0aGF0IHNhdmVzXG4gICAgICAgICAqIHRoZSB1c2VyJ3MgY29sb3IgdGhlbWUuICBUaGlzIGlzIG5lZWRlZCB0byBjcmVhdGUgYVxuICAgICAgICAgKiBkZWZhdWx0IG5vdGUgdGVtcGxhdGUgdGhhdCByZWZsZWN0cyBlYWNoIHNpdGUncyBjdXN0b21cbiAgICAgICAgICogY29sb3IgdGhlbWUuXG4gICAgICAgICAqL1xuICAgICAgICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiggKXtcbiAgICAgICAgICAgIC8vTG9hZGluZy9TYXZpbmcgY29sb3Igc2NoZW1lIGZvciBkZWZhdWx0IG5vdGUgY29sb3IuLiBubyBlYXN5IHdheSB0byBkbyB0aGlzXG4gICAgICAgICAgICB2YXIgc2l0ZVRlbXBsYXRlQ29sb3IgPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQoJ3NpdGUtdGVtcGxhdGUtY29sb3JzJyk7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5ldyBzaXRlVGVtcGxhdGVDb2xvcigpKTtcblxuICAgICAgICAgICAgdmFyIHN0eWxlcyA9IFsnY29sb3InLCAnYmFja2dyb3VuZC1jb2xvcicsICdib3JkZXItY29sb3InXTtcbiAgICAgICAgICAgIHNpdGVDb2xvclN0eWxlcyA9ICQoJ3NpdGUtdGVtcGxhdGUtY29sb3JzJykuY3NzKHN0eWxlcyk7XG4gICAgICAgICAgICBzaXRlQ29sb3JTdHlsZXMuaG92ZXIgPSAkKCdzaXRlLXRlbXBsYXRlLWNvbG9ycycpLmNzcygnb3V0bGluZS1jb2xvcicpO1xuXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MuZGVzaWduLnRleHQuY29sb3IgPT09ICdjb2xvci0xJykge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLmRlc2lnbiA9IGdldFRlbXBsYXRlRGVzaWduKCdkZWZhdWx0Tm90ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XSk7XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gQW5ndWxhciBkaXJlY3RpdmUgdGhhdCB2YWxpZGF0ZXMgd2ViLWxpbmtzIHRvIG1ha2VcbiAgICAgKiBzdXJlIHRoZXkgaW5jbHVkZSB0aGUgaHR0cHMgcHJlZml4LlxuICAgICAqL1xuICAgIGFwcC5kaXJlY3RpdmUoJ2h0dHBQcmVmaXgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBlbnN1cmVIdHRwUHJlZml4KHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5lZWQgdG8gYWRkIHByZWZpeCBpZiB3ZSBkb24ndCBoYXZlIGh0dHA6Ly8gcHJlZml4IGFscmVhZHkgQU5EIHdlIGRvbid0IGhhdmUgcGFydCBvZiBpdFxuICAgICAgICAgICAgICAgICAgICBpZih2YWx1ZSAmJiAhL14oaHR0cHMpOlxcL1xcLy9pLnRlc3QodmFsdWUpICYmICdodHRwczovLycuaW5kZXhPZih2YWx1ZSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyLiRzZXRWaWV3VmFsdWUoJ2h0dHBzOi8vJyArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXIuJHJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdodHRwczovLycgKyB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXIuJGZvcm1hdHRlcnMucHVzaChlbnN1cmVIdHRwUHJlZml4KTtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyLiRwYXJzZXJzLnB1c2goZW5zdXJlSHR0cFByZWZpeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbn0pKCk7XG5cblxuXG5cbn0se1wiLi9kZWZhdWx0VGVtcGxhdGVzXCI6XCIvVXNlcnMvZWxhbmFzL0Rlc2t0b3AvV2l4IFByb2plY3RzL3JvbGxpbmctbm90ZXMvcHVibGljL2phdmFzY3JpcHRzL2RlZmF1bHRUZW1wbGF0ZXMuanNcIn1dfSx7fSxbXCIvVXNlcnMvZWxhbmFzL0Rlc2t0b3AvV2l4IFByb2plY3RzL3JvbGxpbmctbm90ZXMvcHVibGljL2phdmFzY3JpcHRzL3NldHRpbmdzLWFwcC5qc1wiXSk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvZmFrZV81MzgxNTg3My5qc1wiLFwiL1wiKSJdfQ==
