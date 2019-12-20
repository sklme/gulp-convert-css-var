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

        //检查是否在媒体查询中有dark mode
        function checkIsDarkRule(ast){
            let isDark = false
            
            if(!ast) return false
            csstree.walk(ast, (node) => {
                if(node.type == 'MediaFeature' && node.name == 'prefers-color-scheme' && node.value.name == 'dark'){
                    isDark = true
                }
            })
            return isDark
        }

        //检查是否是在body或者root中
        function checkIsRootTag(ast){
            let isRoot = false
            
            if(!ast) return false
            csstree.walk(ast, (node, item) => {
                if(
                    (node.type == 'TypeSelector' && node.name == 'body') || 
                    (node.type == 'PseudoClassSelector' && node.name == 'root')
                ){
                    isRoot = true
                }
            })
            return isRoot
        }
        // 检查是否是单纯的选择器，没有属性选择器之类的。
        function checkIsSingleRoot(ast){
            let isSingle = false
            if(!ast) return false
            csstree.walk(ast, {
                enter(node, item){
                    if(
                        (node.type == 'TypeSelector' && node.name == 'body') || 
                        (node.type == 'PseudoClassSelector' && node.name == 'root')
                    ){
                        if(!item.prev && !item.next){
                            isSingle = true 
                        }
                    }
                }
            })
            return isSingle
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

        csstree.walk(ast,{
            visit:'Declaration',
            enter(node){
                //找出变量定义的规则
                if(
                    node.property && 
                    node.property.match(/^--/)
                ){
                    let isMediaDark = checkIsDarkRule(this.atrule),
                        isRootTag = checkIsRootTag(this.rule.prelude),
                        isSingle = checkIsSingleRoot(this.rule.prelude)


                    // 是黑暗模式的变量
                    if(isMediaDark && isRootTag){
                        colorMap[`${node.property}_dark`]= node.value

                    }
                    // 是默认模式的变量
                    else if(!isMediaDark && isSingle){
                        colorMap[node.property]= node.value
                    }
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