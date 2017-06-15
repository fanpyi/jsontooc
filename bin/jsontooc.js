#!/usr/bin/env node
'use strict';
var fs = require('fs')
var deasync = require('deasync')
String.prototype.prefixUpperCase = function(){
    return this.replace(/^\S/,s=>s.toUpperCase())
}
String.prototype.objcClassName = function(){
    return `${classPrefix}${this.prefixUpperCase()}`
}
function usage(){
    var helptext = [ '',
     '   Usage: jsontooc -o classname -p classprefix jsonfile',
     '',
     '   Options:',
     '',
     '      -h,   output usage information',
     '      -o,   Output Objective-C class name',
     '      -p,   class prefix,Defaults is empty',
     ''
    ].join('\n')
    console.log(helptext)
}
function checkArguments(argv){
    var idx = argv.findIndex(item => item == '-h')
    if (idx != -1) {
        usage()
        process.exit(1)
    }
    idx = argv.findIndex(item => item == '-o')
    if (idx == -1) {
        console.log('   please set output Objective-C object name')
        usage()
        process.exit(1)
    }
    idx = argv.findIndex(item => item == '-p')
    let validCount = idx == -1 ? 3 : 5
    if (argv.length != validCount) {
        console.log('   arguments is error!')
        usage()
        process.exit(1)
    }
}
function getopts(argv,opt = ''){
    //defaults opt='',get jsonfile
    let optsList = ['-o','-p']
    var argument = argv.slice()
    if (opt != '') {
        let idx = argument.findIndex(item => item == opt)
        return idx == -1 ? '' : argument[idx +1]
    }else{
        optsList.forEach(item =>{
            let idx = argument.findIndex(i => i == item)
            if (idx != -1) {
                argument.splice(idx,2)
            }
        })
        return argument[0]
    }
}
function getHeaderFileLine(key,obj){
    var attriType = ''
    var className = ''
    let value = obj[key]
    if (typeof value == 'number') {
        attriType = 'assign'
        if (parseFloat(value) == parseInt(value)) {
            className = 'NSInteger'
        }else{
            className = 'float'
        }
    }else if (typeof value == 'string') {
        attriType = 'strong'
        className = 'NSString'
    }else if (typeof value == 'boolean') {
        attriType = 'assign'
        className = 'BOOL'
    }else if (typeof value == 'object'){
        attriType = 'strong'
        if (value instanceof Array) {
            let first = value[0]
            if (value.length == 0 || typeof first != 'object') {
                if (value.length == 0) {
                    className = 'NSArray'
                }else{
                    className = `NSArray<${typeof first == 'string' ? 'NSString' : 'NSNumber'} *>`
                }
            }else{
                console.log('Please enter the name of the following JSON to Objective-C object model:')
                console.log(first)
                process.stdin.setEncoding('utf8')
                process.stdin.resume()
                process.stdin.on('data',inputName=>{
                    if (inputName != null) {
                        inputName = inputName.replace(/\n/g,'')
                        headerFileTree[inputName] = value[0]
                        implementFileTree[inputName] = value[0]
                        if (objectNameMapping[key] == null) {
                            objectNameMapping[key] = inputName
                        }
                        className = `NSArray<${inputName.objcClassName()} *>`
                        process.stdin.pause()
                    } 
                })
            }

        }else{
            className = key.objcClassName()
            headerFileTree[key] = value
            implementFileTree[key] = value
        }
    }
    deasync.loopWhile(()=> className == '')
    return `@property(nonatomic,${attriType})${className} ${attriType == 'strong' ? '*' : ''}${key};\n`
}
function getImplementFileLine(key,obj){
    var functionName = ''
    var ret = ''
    let value = obj[key]
    if (typeof value == 'number' || typeof value == 'boolean') {
        if (typeof value == 'number') {
            if (parseFloat(value) == parseInt(value)) {
                functionName = 'integerValue'
            }else{
                functionName = 'floatValue'
            }
        }else{
            functionName = 'boolValue'
        }
        ret = `_${key} = [dic[@"${key}"]${functionName}];\n`
    }else if (typeof value == 'string') {
        ret = `_${key} = dic[@"${key}"];\n`
    }else if (typeof value == 'object'){
        if (value instanceof Array) {
             let first = value[0]
             if (value.length == 0 || typeof first != 'object') {
                ret = `_${key} = dic[@"${key}"];\n`
            }else{
                let objectName = objectNameMapping[key]
                ret = `_${key} = [dic[@"${key}"] map:^id(id obj, int index) {\n            return [[${objectName.objcClassName()} alloc]initWithDictionary:obj];\n        }];\n`
            }
        }else{
            ret = `_${key} = [[${key.objcClassName()} alloc]initWithDictionary:dic[@"${key}"]];\n`
        }
    }
    return `        ${ret}`
}
let argv = process.argv.splice(2)
checkArguments(argv)
let classPrefix = getopts(argv,'-p')
let inputObjectName = getopts(argv,'-o')
let objectName = inputObjectName.objcClassName()
let jsonFilePath = getopts(argv)
let jsonString = fs.readFileSync(jsonFilePath,'utf-8')
let json = JSON.parse(jsonString)
var headerFileString = ''
var implementFileString = `#import "${objectName}.h"\n`
var headerFileTree = {}
var implementFileTree={}
implementFileTree[inputObjectName] = json
var objectNameMapping = {}

headerFileString += `@interface  ${objectName} : NSObject\n`
Object.keys(json).forEach(key =>{
    headerFileString += getHeaderFileLine(key,json)
})
headerFileString += "-(instancetype)initWithDictionary:(NSDictionary*)dic;\n@end\n"
while(Object.keys(headerFileTree).length != 0){
    let keys =  Object.keys(headerFileTree)
    keys.forEach(key=>{
        headerFileString += `@interface ${key.objcClassName()} : NSObject\n`
        let v = headerFileTree[key]
        Object.keys(v).forEach(k=>{
            headerFileString += getHeaderFileLine(k,v)
        })
        headerFileString += "-(instancetype)initWithDictionary:(NSDictionary*)dic;\n@end\n"
        delete headerFileTree[key]
    })
}
Object.keys(implementFileTree).forEach(key=>{
    implementFileString += `@implementation ${key.objcClassName()}\n-(instancetype)initWithDictionary:(NSDictionary *)dic{\n    self = [super init];\n    if (self) {\n`
    let v = implementFileTree[key]
    Object.keys(v).forEach(k=>{
        implementFileString += getImplementFileLine(k,v)
    })
    implementFileString += `    }\n    return self;\n}\n@end\n`
})

let classStatement = Object.keys(implementFileTree).splice(1).map(item=> `@class ${item.objcClassName()};`).join('\n')
fs.writeFileSync(objectName + '.h',`#import <Foundation/Foundation.h>\n${classStatement}\n${headerFileString}`,'utf-8')
fs.writeFileSync(objectName + '.m',implementFileString,'utf-8')







