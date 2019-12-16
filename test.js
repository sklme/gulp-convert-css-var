// require mocha in global to test

var assert = require('assert'),
    es = require('event-stream'),
    gutil = require('gulp-util'),
    PassThrough = require('stream').PassThrough,
    convert = require('./index');


describe('gulp-convert-css-variable', function() {
    const testStr = ':root{--BG-0:#ededed;--FG-0:rgba(0, 0, 0, .9)}.example{margin-top:20px;color:var(--FG-0);background:var(--BG-0);}.example .aa{margin:10px}'
    const testStrError = ':root{--BG-0:#ededed;--FG-0:rgba(0, 0, 0, .9)}.example{margin-top:20d:var(--BG-0)}.example .aa{margin:1px'

    it('能生成对应的颜色值', function(done) {
        let stream = convert()
        var fakeBuffer = Buffer.from(testStr)
        var fakeFile = new gutil.File({
            contents: fakeBuffer
        })

        stream.on('data', function(newFile) {
            let str = newFile.contents.toString()

            let colorMatch = str.match(/color.+;/g)

            assert.ok(colorMatch[0].match('rgba\\(0, 0, 0, .9\\);'),'没有生成对应的颜色')

            assert.ok(colorMatch[1].match('var\\(--FG-0\\)'), '没有保留变量写法的规则')
        })

        stream.on('end', function() {
            done()
        })

        stream.write(fakeFile)
        stream.end();
    })

    it('能处理出错的css源文件',function(done){
        let stream = convert()
        var fakeBuffer = Buffer.from(testStrError)
        var fakeFile = new gutil.File({
            contents: fakeBuffer
        })

        stream.on('data', function(newFile) {
            let str = newFile.contents.toString()
            // console.log(newFile.contents.toString())
        })

        stream.on('end', function() {
            done()
        })

        stream.write(fakeFile)
        stream.end();
    })
})