# vue-test
vue-test

开这个帖子是想记录一下自己对VUE的理解和想法，也希望大家能跟我一起一步一步了解一下VUE这个各方面表现良好，最主要是国人写的前端MVVM框架的神奇之处

## 1.脏检测

在很多年前angular刚出来时候，我们发现了这个神奇的功能，数据和视图同步。经典的案例，就是这张图

![](https://github.com/weiyou789/vue-test/blob/master/images/img01.png)

当时实现这个功能需要实现一套观察者模式，但是在VUE里，它使用了一个神奇的ES5的对象方法就是这个Object.defineProperty这个方法大家可以百度去看。我这里只
简单说一下，这个主要给对象设置一些额外的特性，比如说属性值是否可写，是否能枚举等。但是在VUE里主要是使用了这个方法的储存器（get/set）写起来大概是这样的

```javascript
Object.defineProperty(o, "b", {
	get : function(){ 
		return bValue; 
	},
	set :function(newValue){
 		bValue = newValue; 
	},
});
```
get就是当属性的值被获取的时候触发,set就是当属性的值被赋值的时候触发

用这两个特性写一个脏检测就非常简单了，我这里就简单实现一下上面输入框这个功能

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>test1</title>
</head>
<body>
<div>
    <input id="introduce1" type="text" value="" />
    <div id="introduce"></div>
    <script>
       function $(id){
         return document.getElementById(id);
       }

      var userInfo = {};

      Object.defineProperty(userInfo, "introduce", {
        get: function(){
          return $('introduce').innerHTML;
        },
        set: function(val){
          $('introduce').innerHTML = val;
        }
      })

       userInfo.nickName = "xxx";
      $('introduce1').onkeyup = function(){
        userInfo.introduce = this.value
      }


    </script>
</div>　
</body>
</html>
```
对，你没看错，就是这么简单就可以实现输入框与数据同步。

脏检测就到这里，后面待用

## 2.虚拟dom

虚拟dom这个梗已经被玩了很久了，大家可以百度出一堆。说白了就是把真实的DOM转化成对象来表示。

会用VUE的可以建一个最简单的VUE的组件大概像这样

![](https://github.com/weiyou789/vue-test/blob/master/images/img02.png)

真实的dom是上图这样的，这个dom在VUE里的虚拟DOM表现形式是这样的

![](https://github.com/weiyou789/vue-test/blob/master/images/img03.png)

重点看我框住的那些，tag里存的是标签名，data里存的就是class之类的属性，children就是这个元素的子元素，如果children的元素还有子元素就以此类推，你可以自己展开children看一下，里面还是这样

为什么要把真实dom转成虚拟dom呢？

我理解：

1.性能问题，操作真实dom确实很耗性能。

2.因为VUE要经常操作dom，如果是操作真实dom是非常麻烦的，使用虚拟dom我可以很方便的用JS对dom进行操作，比如使用diff算法来对比一下新旧的dom变化等。

3.VUE要自定义很多东西在dom里，比如说指令v-if等，还有模板语法{{test}}等，而这就就决定了必须要对dom进行虚拟化

对真实dom进行虚拟化和把虚拟dom渲染成真实dom，VUE是参照了htmlparser，snabbdom这两个库来实现的。

其中的htmlparser是jquery作者写的。。。

虚拟dom就到这里，后面待用

## 3.一个思路

VUE最简单的使用方式

```html
<template>
  <div class="hello">
    <div class="test">{{ msg }}</div>
  </div>
</template>

<script>
export default {

  data () {
    return {
      msg: 'Welcome to Your Vue.js App111'
    }
  },
  created(){
    
  }
}
</script>
```

结合上面我上面说的脏检测和虚拟dom思想，我们就会有个模糊思路了：

1.首先把data里面的属性(比如上面的msg)绑定好存储器就是(get/set)。

2.然后虚拟DOM是作为data和html之间的中间层，把data里面的属性取值后放入到虚拟dom中，然后在把虚拟dom解析成正常dom渲染到HTML中。注意：这里说了取值，因为我们把属性绑定了get方法，所以取值就会触发这个get里面的方法，在这个get方法里，我们开始收集这个属性值对应的依赖，所谓收集依赖就是建立一个这个属性值的观察者（watcher），这个观察者里存着这个属性对应的更新（update）函数，比如这里msg这个属性对应的观察者的更新函数就是渲染（render）html的函数。在VUE里每个属性对应的watcher类是放在了订阅器（dep）的subs数组里。

![](https://github.com/weiyou789/vue-test/blob/master/images/img04.png)

3.收集好了依赖干嘛呢？当然是等待时机执行这个观察者的更新函数了，什么时候是时机？当然是这个属性值改变的时候了。因为我们给这个属性绑定了set方法，所以当该属性改变的时候set方法就会执行，在set方法里我们只要触发观察者的更新函数就可以了，比如这个msg更新函数就是渲染函数，然后HTML就从新渲染了。从新渲染时又需要取data里面的属性值，这时又开始执行get函数从新收集依赖。

我们就跟随这个思路实现一下，首先我们需要有个函数用来给属性值绑定get/set方法，然后在get方法里执行收集依赖具体怎么收集我后面会详细说，然后在set方法里执行订阅器里的观察者的更新方法，大概就像下面这样

```javascript
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
```

接着我们要搞个订阅器dep,用来放观察者，大概是这样的

```javascript
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
```

有了订阅器以后当然是要有观察者了，大概是这样的

```javascript
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
```
然后当然要有一个VUE类

```javascript
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
        HTMLParser(template, {//解析模板生成vnode,需要引入htmlparser这个库
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
```

不要看这个VUE类里有这么多代码，其实大多数是解析虚拟dom和把dom渲染成真实HTML的代码，去掉这两件事，这里主要只干了下面这几件事

1.当然是执行我上面的第一个函数给属性绑定get/set

2.需要首先new一次观察者实例，执行一次页面渲染同时进行依赖收集

具体依赖收集的代码执行过程是这样的，当this._watcher = new Watch(this, this._render.bind(this), this._render.bind(this))执行的时候，把渲染函数和vue对象传入到watcher对象里，此时watcher的执行 this.get()方法,在 get()里，把watcher类放入了全局变量targetStack里，然后执行渲染函数，执行渲染函数会取data里面的属性值，此时触发了属性get方法，在属性的ge方法里，执行了dep对象里的depend()方法，在depend方法里执行了watcher类的addDep方法，把dep类传进去，然后去重，执行当前dep类的addSub方法，把watcher类放到subs数组里去。到这里就把属性对应的观察者放到了订阅器里，之后就会把页面渲染出来

当属性值改变时候代码执行的过程是这样的，首先属性值改变会触发属性值的set方法，然后在set方法里，我们就直接执行了该属性对应的dep类里的notify()方法，这个方法就是直接执行了上面收集的watcher类里的update方法重新渲染页面

这就是VUE的MVVM思想的核心。必须感叹一下尤雨溪编码能力！
