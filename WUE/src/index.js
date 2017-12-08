import Watcher from './core/observer/watcher'
import { query, warn, idToTemplate, toString, resolveAsset, hasOwn, isFunction, createElement, remove, bind } from './core/utils'
import { initData ,initMethods} from './core/instance'
import { compileToFunctions } from './core/parser'
import { patch, h, VNode } from './core/vnode'
import { directive } from './plugin/directives'
import { event } from './plugin/event'

let uid = 0;
export default class WVM {
    constructor(options){
        this.$options = options;
        this._uid = uid++;
        this.$options.delimiters = this.$options.delimiters || ["{{", "}}"]
        this._watchers = [];
        callHook(this, 'beforeCreate');
        if (options.data) {
            initData(this, options.data)
        }
        if (options.methods) {
            initMethods(this, options.methods)
        }
        this.$mount(options.el);
        callHook(this, 'created');
    }
    static use(plugin) {
        plugin && plugin.install && plugin.install.call(this, WVM);
    }
    static $set(target, key, val) {
        if (Array.isArray(target) && Number(key) !== NaN) {
            target.length = Math.max(target.length, key)
            target.splice(key, 1, val)
            return val
        }
        if (hasOwn(target, key)) {
            target[key] = val
            return val
        }
        const ob = target.__ob__
        if (target._isWVM || (ob && ob.vmCount)) {
            //避免给根节点添加监听
            return val
        }
        if (!ob) {
            target[key] = val
            return val
        }
        defineReactive(ob.value, key, val)
        ob.dep.notify()
        return val
    }
    static $delete(target, key) {
        if (Array.isArray(target) && typeof key === 'number') {
            target.splice(key, 1)
            return
        }
        const ob = target.__ob__;
        if (target._isVue || (ob && ob.vmCount)) {
            return
        }
        if (!hasOwn(target, key)) {
            return
        }
        delete target[key]
        if (!ob) {
            return
        }
        ob.dep.notify()
    }
    $mount(el){
        let options = this.$options;
        this.$el = el = el && query(el);
        if(!options.render){
            let template = options.template;
            if (template) {
                if (typeof template === 'string') {
                    //获取script的template模板
                    if (template[0] === '#') {
                        template = idToTemplate(template)
                    }
                    //获取DOM类型tempalte
                } else if (template.nodeType) {
                    template = template.innerHTML
                }
                //直接从入口处获取template
            } else if (el) {
                template = getOuterHTML(el)
            }
            //生成render函数
            if (template) {
                //生成render函数
                const render = compileToFunctions(template, this);
                options.render = render;//render是渲染函数不是虚拟dom，需要用h函数来解析成虚拟dom
                console.log(render)
            }
        }

        //console.log(this._render())
        callHook(this, 'beforeMount');
        var wm = this;
      this._watcher = new Watcher(this,
        function () { wm._update(wm._render(), this._h); },
        function updateComponent() {
          wm._update(wm._render(), this._h);
        });
      //}

      if (!this._vnode) {
        this._isMounted = true
        callHook(this, 'mounted')
      }

      return this
    }
    _patch = patch
    _s = toString
    _render() {//返回最终版vnode,传入_update函数进行第一次渲染
        let render = this.$options.render
        let vnode
        try {
            //自动解析的template不需要h,用户自定义的函数需要h
            vnode = render.call(this, this._h);//传入h函数解析成虚拟dom
        } catch (e) {
            warn(`render Error : ${e}`)
        }
        console.log(vnode)
        return vnode
    }


  _update(vnode) {//渲染dom
    if (this._isMounted) {
      callHook(this, 'beforeUpdate')
    }
    const prevVnode = this._vnode
    this._vnode = vnode;
    if (!prevVnode) {
      this.$el = this._patch(this.$el, vnode)//第一次渲染
    } else {
      this.$el = this._patch(prevVnode, vnode)//更新时对比达到最优方案渲染，diff算法
    }
    if (this._isMounted) {
      callHook(this, 'updated')
    }
  }

    _h(sel, data, children) {//使用H函数转换成vnode
        data = data || {}
        //没有attr时,child顶上
        if (Array.isArray(data)) {
            children = data
            data = {}
        }

        data.hook = data.hook || {}

        if (this.$options.destroy) {
            data.hook.destroy = bind(this.$options.destroy, this)
        }

        if (Array.isArray(children)) {
            let faltChildren = []

            children.forEach((item) => {
                if (Array.isArray(item)) {
                    faltChildren = faltChildren.concat(item)
                } else {
                    faltChildren.push(item)
                }
            })

            children = faltChildren.length ? faltChildren : children
        }

       /* if (typeof sel == 'string') {
            let Ctor = resolveAsset(this.$options, 'components', sel)
            if (Ctor) {
                return this._createComponent(Ctor, data, children, sel)
            }
        }*/
        return h(sel, data, children)
    }
}


function callHook(wm,hook){
    const handlers = wm.$options[hook];
    if(handlers){
        if(Array.isArray(handlers)){
            for (let i = 0, j = handlers.length; i < j; i++) {
                try {
                    handlers[i].call(wm)
                } catch (e) {
                    handleError(e, wm, `${hook} hook`)
                }
            }
        }else{
            handlers.call(wm);
        }
    }
}



WVM.use(directive);
WVM.use(event);
global.WVM = WVM;