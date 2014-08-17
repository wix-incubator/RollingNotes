var assert = require("assert")

describe('MochaTest', function(){
    describe('#indexOf()', function(){
        it('should return -1 when the value is not present', function(){
            assert.equal(-1, [1,2,3].indexOf(5));
            assert.equal(-1, [1,2,3].indexOf(0));
        })
    })
})

var mocha = require('mocha');
//console.log(mocha);

var expect = require('chai').expect;

describe("SampleChaiTest", function() {
    describe("constructor", function () {
        it("should have a default name", function () {

            expect(1).to.equal(1);
        });


    });
});