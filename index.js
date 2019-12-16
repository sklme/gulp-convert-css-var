let through = require('through2')
let gutil = require('gulp-util')
let PluginError = gutil.PluginError
let csstree = require('css-tree')
let cssbeautify = require('cssbeautify')

// 常量
const PLUGIN_NAME = 'gulp-convert-css-var';

//颜色map
let colorMap = {}

function createRule(property, value, type){
    if(!property || !value) return false
    type = type || 'Raw'

    let data = {
        "type": "Declaration",
        "loc": null,
        "important": false,
        property,
        "value": {
            "type": "Value",
            "loc": null,
            "children": [
                {
                type,
                "loc": null,
                value
                }
            ]
        }
    }

    return {
        prev: null,
        next: null,
        data
    }
}

function gulpProfixer(){

    //创建一个 stream 通道，让每个文件通过
    let stream = through.obj(function(file, enc, cb){

        //不支持stream
        if(file.isStream()){
            this.emit('error', new PluginError(PLUGIN_NAME, 'It does not support stream for now, contact the developers for further support.'))
            return cb()
        }

        let contents = file.contents.toString()
        let ast = csstree.parse(contents)

        // 生成颜色map
        csstree.walk(ast, (pnode, item, list) => {
            // 找到有前缀名的prelude
            if(pnode.prelude){
                let pl = pnode.prelude,
                    pb = pnode.block

                // 找到:root的规则
                let isRootFlag = false
                csstree.walk(pl, (node) => {
                    if(node.name === 'root' && node.type === 'PseudoClassSelector'){
                        isRootFlag = true
                    }
                })

                // 找到:root之后，从:root抽出所有的颜色，制作成一个map
                if(isRootFlag){
                    csstree.walk(pb, (node) => {
                        // 证明是一个颜色定义
                        if(node.property && node.type === 'Declaration'){
                            colorMap[node.property]= node.value
                        }
                    })
                }
            }
        })

        // 给所有通过变量赋值的颜色多加一个保底的颜色
        csstree.walk(ast, (pnode, item, list) => {
            if(pnode.type == "Declaration"){
                csstree.walk(pnode, (node) => {

                    if(node.type === 'Function' && node.name === 'var'){

                        // 取出颜色的变量名字
                        let varName = ''
                        csstree.walk(node, (cnode) => {
                            if(cnode.type == 'Identifier'){
                                varName = cnode.name
                            }
                        })


                        //如果色板上有对应的颜色，才进行加一行颜色
                        if(colorMap[varName]){
                            let value = colorMap[varName].value.trim()
                            list.insert(createRule(pnode.property, value), item)
                        }
                    }
                })
            }
        })
        
        let css = csstree.generate(ast)
        let bu = Buffer.from(cssbeautify(css,{
            indent: '  ',
            openbrace: 'end-of-line',
            autosemicolon: true
        }))
        file.contents = bu
        
        // 给下一个插件提供文件
        this.push(file)

        // 告诉stream引擎，我们已经处理完成了这个文件
        cb()
    })

    return stream
}

module.exports = gulpProfixer