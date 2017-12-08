const isAttr = makeMap(
    'accept,accept-charset,accesskey,action,align,alt,async,autocomplete,' +
    'autofocus,autoplay,autosave,bgcolor,border,buffered,challenge,charset,' +
    'checked,cite,class,code,codebase,color,cols,colspan,content,http-equiv,' +
    'name,contenteditable,contextmenu,controls,coords,data,datetime,default,' +
    'defer,dir,dirname,disabled,download,draggable,dropzone,enctype,method,for,' +
    'form,formaction,headers,height,hidden,high,href,hreflang,http-equiv,' +
    'icon,id,ismap,itemprop,keytype,kind,label,lang,language,list,loop,low,' +
    'manifest,max,maxlength,media,method,GET,POST,min,multiple,email,file,' +
    'muted,name,novalidate,open,optimum,pattern,ping,placeholder,poster,' +
    'preload,radiogroup,readonly,rel,required,reversed,rows,rowspan,sandbox,' +
    'scope,scoped,seamless,selected,shape,size,type,text,password,sizes,span,' +
    'spellcheck,src,srcdoc,srclang,srcset,start,step,style,summary,tabindex,' +
    'target,title,type,usemap,value,width,wrap'
)
const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]/\\]/g

function _s(val){
    return val == null ? '' : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
}

function makeMap(str, expectsLowerCase) {
    const map = Object.create(null)
    const list = str.split(',')
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true
    }
    return expectsLowerCase
        ? val => map[val.toLowerCase()]
        : val => map[val]
}

function makeAttrsMap(attrs, delimiters) {//属性映射
    const map = {}
    for (let i = 0, l = attrs.length; i < l; i++) {
        map[attrs[i].name] = attrs[i].value
    }
    return map
}

function makeFunction(code) {//把字符串转成函数
    try {
        return new Function(code)
    } catch (e) {
        return function(){}
    }
}

function callHook(vm,hook){//生命周期钩子函数
    const handlers = vm.$options[hook];
    if(handlers){
        if(Array.isArray(handlers)){
            for (let i = 0, j = handlers.length; i < j; i++) {
                try {
                    handlers[i].call(vm)
                } catch (e) {
                    console.log(e)
                }
            }
        }else{
            handlers.call(vm);
        }
    }
}

function setElAttrs(el, delimiters) {
    var s = delimiters[0], e = delimiters[1];
    var reg = new RegExp(`^${s}(\.+\)${e}$`);
    var attrs = el.attrsMap;
    //console.log(attrs)
    for (let key in attrs) {
        let value = attrs[key];
        var match = value.match(reg)
        //console.log(11,match)
        if (match) {
            value = match[1];
            if (isAttr(key)) {
                el.props[key] = '_s('+value+')';
            } else {
                el.attrs[key] = value;
            }
        } else {
            if (isAttr(key)) {
                el.props[key] = "'" + value + "'";
            } else {
                el.attrs[key] = "'" + value + "'";
            }
        }

    }
}

/*function setElDrictive(el, attrs) {
    for (let i = 0, l = attrs.length; i < l; i++) {
        let name = attrs[i].name
        //let darr = name.match(drictiveRE);
        //console.log(222,darr)
        if (name) {
            //removeAttr(el, name)
            el[name] = {
                name: name,
                expression: attrs[i].value,
                //modifiers: split(darr[3]),
                //arg: darr[2] && darr[2].slice(1)
            }
        }
    }
}*/

function cached(fn) {
    const cache = Object.create(null)
    return function cachedFn(str) {
        const hit = cache[str]
        return hit || (cache[str] = fn(str))
    }
}

const buildRegex = cached(delimiters => {
    const open = delimiters[0].replace(regexEscapeRE, '\\$&')
    const close = delimiters[1].replace(regexEscapeRE, '\\$&')
    return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

function TextParser(text, delimiters) {//提取字符串
    const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
    if (!tagRE.test(text)) {
        return
    }
    const tokens = []
    let lastIndex = tagRE.lastIndex = 0
    let match, index
    while ((match = tagRE.exec(text))) {
        index = match.index
        // push text token
        if (index > lastIndex) {
            tokens.push(JSON.stringify(text.slice(lastIndex, index)))
        }
        // tag token
        const exp = match[1].trim()
        tokens.push(`_s(${exp})`)
        lastIndex = index + match[0].length
    }
    if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)))
    }
    return tokens.join('+')
}

function _proxy(target, sourceKey, key){//代理函数
    sharedPropertyDefinition.get = function proxyGetter() {
        return this[sourceKey][key]
    }
    sharedPropertyDefinition.set = function proxySetter(val) {
        this[sourceKey][key] = val
    }
    Object.defineProperty(target, key, sharedPropertyDefinition)
}

function remove(arr, item) {
    if (arr.length) {
        const index = arr.indexOf(item)
        if (index > -1) {
            return arr.splice(index, 1)
        }
    }
}


function query(el) {
    if (typeof el === 'string') {
        const selector = el
        el = document.querySelector(el)
        if (!el) {
            return document.createElement('div')
        }
    }
    return el
}

const Set = (function () {
    let _Set = class Set {
      constructor() {
        this.set = Object.create(null)
      }
      has(key) {
        return this.set[key] === true
      }
      add(key) {
        this.set[key] = true
      }
      clear() {
        this.set = Object.create(null)
      }
    }
  return _Set;
})()

function observer(value, cb){
    Object.keys(value).forEach((key) => defineReactive(value, key, value[key] , cb))
}

function defineReactive(obj, key, val, cb) {//给每个属性设置get/set函数
    const dep = new Dep()
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: ()=>{
            if(Dep.target){
                dep.depend()//当属性被取值时候收集依赖
            }
            return val
        },
        set: newVal => {
            if(newVal === val)
                return
            val = newVal

            dep.notify()//当属性被重新赋值时执行通知该属性的订阅者，执行update函数
        }
    })
}

const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: function(){},
    set: function(){}
}

class Vue {
  constructor(options) {
    this.$options = options
      this.$options.delimiters = this.$options.delimiters || ["{{", "}}"]
    this.$data = options.data
      let vm = this;
    observer(options.data)//给data的属性设置get,set
      if (options.methods) {
          for (const key in methods) {
              vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
          }
      }
    const keys = Object.keys(this.$data);
    let i = keys.length;
    while (i--){
       _proxy(vm,'$data',keys[i])//把data代理到VUE的实例上去this.data.text = this.text
    }

    this.$mount(options.el);
    callHook(this, 'created');
  }
    $mount(el){
        this.$el = el = el && query(el);
        let root
        let currentParent
        let template = el.innerHTML
        let stack = [];//记录当前节点位置:push,pop(树形)
        let vm = this;
        HTMLParser(template, {//解析模板生成vnode
            start: function( tag, attrs, unary ) {
                const element = {
                    vm: vm,
                    type: 1,
                    tag,
                    //属性[{name:key,value:value},...]
                    attrsList: attrs,
                    //属性{key1:value1,key2:value2}
                    attrsMap: makeAttrsMap(attrs),//json格式转换
                    parent: currentParent,
                    children: [],
                    events: {},
                    nativeEvents: {},
                    style: null,
                    hook: {},
                    props: {},//DOM属性
                    attrs: {}//值为true,false则移除该属性
                }
                /*setElDrictive(element, attrs);*/
                setElAttrs(element, vm.$options.delimiters);
                if (!root) {
                    vm.$vnode = root = element
                }
                if(currentParent){
                    currentParent.children.push(element)
                    element.parent = currentParent
                }
                if (!unary) {
                    currentParent = element
                    stack.push(element)
                }
            },
            end: function( tag ) {
                const element = stack[stack.length - 1]
                const lastNode = element.children[element.children.length - 1]
                //删除最后一个空白文字节点
                if (lastNode && lastNode.type === 3 && lastNode.text === ' ') {
                    element.children.pop()
                }
                stack.length -= 1
                currentParent = stack[stack.length - 1]
            },
            chars: function( text ) {//处理字符串
                if (!text.trim()) {
                    return;
                }
                let expression = TextParser(text, vm.$options.delimiters)
                if (expression) {
                    currentParent.children.push({
                        type: 2,
                        expression,
                        text
                    })
                } else {
                    currentParent && currentParent.children.push({
                        type: 3,
                        text
                    })
                }
            }
        });
        this._watcher = new Watch(this, this._render.bind(this), this._render.bind(this))//首次触发render获取依赖
    }
  _update(vnode) {//执行渲染

      let vm = this
      let wrap = document.createElement(vnode.tag);
      let props = vnode.attrsMap;
      for (let propName in props) {
          let propValue = props[propName]
          wrap.setAttribute(propName, propValue);
      }
      if(vnode.children){//type是1代表是dom节点，2代表是我们自定义的字符串节点，3代表是文本节点
          vnode.children.map((val)=>{
              let childEl;
              if(val.type==1){//当是dom节点时候执行递归，继续处理子节点
                  childEl =  vm._update(val)
              }else if(val.type==2){//当是我们自定义节点时，取值触发get函数
                  let f2 = makeFunction(`with(this){return ${val.expression}}`)//包装成with函数
                  childEl = document.createTextNode(f2.call(vm))//执行取值，此时触发属性get函数
              }else{
                  childEl = document.createTextNode(val.text)//文本节点直接创建
              }
              wrap.appendChild(childEl);
          })
      }
      vm.$el.appendChild(wrap);
      return wrap
  }
  _render() {
    let vm = this;
    let vnode = vm.$vnode
    this.$el.innerHTML = '';
    this._update(vnode)
  }
}

class Watch{//订阅者
  constructor(vm, exp, cb) {
    this.cb = cb
    this.vm = vm
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.getter = exp
    this.value = this.get()
  }
  get(){
    pushTarget(this)
    let value
    const vm = this.vm
    value = this.getter.call(vm, vm)
    popTarget()
    this.cleanupDeps()
    return value
  }
  update() {
    this.run()
  }
  run(){
    this.get()
  }
  addDep(dep){
    const id = dep.id
    if (!this.newDepIds.has(id)) {//去重
      this.newDepIds.add(id)
        this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }
  cleanupDeps() {
      let i = this.deps.length
      while (i--) {
          const dep = this.deps[i]
          if (!this.newDepIds.has(dep.id)) {
              dep.removeSub(this)
          }
      }
      let tmp = this.depIds
      this.depIds = this.newDepIds
      this.newDepIds = tmp
      this.newDepIds.clear()
      tmp = this.deps
      this.deps = this.newDeps
      this.newDeps = tmp
      this.newDeps.length = 0
      //console.log(this.deps)
  }
}

let uid = 0;
class Dep {//消息－订阅器，订阅器里维护着所有订阅者，一旦触发set就执行所有订阅者的update方法
  constructor() {
    this.subs = []
    this.id = uid++
  }
  addSub(sub) {
    this.subs.push(sub)
  }
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
  removeSub(sub) {
      remove(this.subs, sub)
  }
  notify() {
    this.subs.forEach((w) => w.update())
  }
}

Dep.target = null
const targetStack = []
function pushTarget(_target) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

function popTarget() {
  Dep.target = targetStack.pop()
}



