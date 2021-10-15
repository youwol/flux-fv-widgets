import { BehaviorSubject, combineLatest, Observable, Subject, Subscription } from 'rxjs'

import { map } from 'rxjs/operators'
import { Switch } from '@youwol/fv-button'
import { Select, ColorPicker, Slider} from '@youwol/fv-input'
import { Tabs } from '@youwol/fv-tabs'
import { attr$, child$, HTMLElement$, VirtualDOM } from '@youwol/flux-view'
import {cloneDeep} from 'lodash'

export namespace AutoForm {

    export interface ValueDescription{ name: string, type: string, metadata: any }
    export type ValueType = number | string | boolean

    export interface Schema {

        [key: string]: ValueDescription
    }

    export class State {

        inputValues$: BehaviorSubject<Object>
        currentValue$ : Subject<any>

        outputValues$ = new Array<Observable<{path:Array<string>,value:ValueType}>>()

        constructor(
            inputValues$: BehaviorSubject<Object> | Object, 
            public readonly schema: Schema,
            public readonly includedProperties: (name:string, description: ValueDescription) => boolean = ()=>true,
            public readonly elementsViewFactory: any = viewFactory
            ) {

            this.inputValues$ = (inputValues$ instanceof BehaviorSubject)
                ? inputValues$ 
                : new BehaviorSubject<Object>(inputValues$ as Object)

            this.currentValue$ = new Subject()
        }
        connect() : Subscription {

            return combineLatest( this.outputValues$ ).subscribe(entries => {
                let base = cloneDeep(this.inputValues$.getValue())
                entries.forEach( ({path, value}) => {
                    let lastPart = path.slice(-1)[0]
                    let parentParts = path.slice(0,-1)
                    parentParts.reduce( (acc,e) => acc[e], base )[lastPart] = value
                })
                this.currentValue$.next(base)
            })        
        }
    }

    export let viewFactory = [
        {
            test: (value: ValueDescription) => value.type == "Boolean",
            view: (value$: BehaviorSubject<boolean>) => {
                Switch.View.defaultRadius = 10
                return new Switch.View({
                    state: new Switch.State(value$)
                } as any)
            }
        },
        {
            test: (value: ValueDescription) => value.metadata.type == "color",
            view: (value$: BehaviorSubject<string>, description: ValueDescription) => {
                
                return new ColorPicker.View({
                    state: new ColorPicker.State(value$)
                } as any)
            }
        },
        {
            test: (value: ValueDescription) => value.metadata.enum,
            view: (value$: BehaviorSubject<string>, description: ValueDescription) => {
                let items = description.metadata.enum.map( text => new Select.ItemData(text, text))
                return new Select.View({
                    state: new Select.State(items, value$),
                    class: 'w-100 ',
                    style: { fontSize: 'larger' }
                } as any)
            }
        },
        {
            test: (value: ValueDescription) => value.type == "String",
            view: (value$: BehaviorSubject<string>) => {
                return { 
                    tag:'input', 
                    type:'text', 
                    value: value$.getValue(),
                    onchange:  (event) => value$.next(event.target.value)
                }
            }
        },
        {
            test: (value: ValueDescription) =>{
                return value.type == "Number" && value.metadata.min != undefined && value.metadata.max != undefined
            },
            view: (value$: BehaviorSubject<number>, description: ValueDescription) =>{
                let hovered$ = new BehaviorSubject(false)
                let state = new Slider.State({min: description.metadata.min, max: description.metadata.max, value:value$, count:1000 })
                return {
                    class:'d-flex',
                    children:[
                        { 
                            tag:'input',
                            class: attr$( hovered$, (isHovered) => isHovered ? 'w-100' : 'w-25'), 
                            type:'number', 
                            value: attr$( value$, (v) => v ),
                            onchange:  (event) => value$.next(Number(event.target.value)),
                            onmouseenter: () => hovered$.next(true),
                            onmouseleave:  () => hovered$.next(false),
                        },
                        new Slider.View({state, class:"w-75"} as any) 
                    ]
                }
            }
        },
        {
            test: (value: ValueDescription) => value.type == "Number",
            view: (value$: BehaviorSubject<number>) =>{
                return { 
                    tag:'input', 
                    type:'number', 
                    value: value$.getValue(),
                    onchange: (event) => value$.next(Number(event.target.value))
                }
            }
        },
    ]

    export class View implements VirtualDOM {

        public readonly state: State

        children : Array<VirtualDOM>

        constructor({state, ...rest} : {state: State}) {
            Object.assign(this, rest)
            this.state = state

            this.children = [
                child$( 
                    state.inputValues$,
                    (formDescription) => {
                        let rootView = groupItems( 
                            Object.entries(state.schema), 
                            formDescription, 
                            [],
                            state
                        )
                        
                        return rootView != undefined ? rootView : {}
                    },
                    {
                        sideEffects: (_, elem: HTMLElement$) => {
                            elem.ownSubscriptions(state.connect())
                        }
                    }
                )
            ]
        }
    }

    function createAttributesGrid(
        items: Array< [string, ValueDescription]>,
        basePath: Array<string>, 
        configurationBase: Object,
        state: State
        ) : VirtualDOM | undefined {
        
        let order = Object.keys(basePath.reduce((acc, e) => acc[e], configurationBase))
        
        items = items
        .filter( ([name,description]) => state.includedProperties(basePath.concat([name]).reduce((acc,e) => acc+'.'+e), description))
        .sort( (lhs, rhs) => order.indexOf(lhs[0]) - order.indexOf(rhs[0]))

        if (items.length == 0) 
            return undefined

        return {
            class:`row object-name-${basePath.slice(-1)[0]} auto-form-grp-content`, style:{ padding:'0px', margin:'0px'},
            children: items.map( item => [
                {
                    class:`col my-auto p-0 auto-form-title value-name-${item[0]}`,
                    innerText: item[0]
                },
                {
                    class:`col pl-0 auto-form-value value-name-${item[0]}`, 
                    title: item[0],
                    style:{ 'align-self': 'center' },
                    children: [
                        leafView(item[1], basePath.concat(item[0]), configurationBase, state)
                    ]
                },
                {   class:"w-100 py-1"}
            ]).reduce((acc,e)=> acc.concat(e))
        }
    }
    function isLeaf(v: ValueDescription) {
        return v.type && ["Number", "String", "Boolean", "Object"].includes(v.type)
    }

    function leafView(
        valueMeta: ValueDescription, 
        path: Array<string>, 
        configuration, 
        state: State
        ): VirtualDOM {

        let value0 = path.reduce((acc, e) => acc[e], configuration)
        let factory = state.elementsViewFactory.find(element => element.test(valueMeta))
        if(! factory)
            return { id:'unkwnown-element-'+ valueMeta.name+'-'+valueMeta.type}
        let value$ = new BehaviorSubject(value0)
        let view = factory.view(value$, valueMeta);
        let obs = ( value$ as Observable<any>).pipe(map(value => ({ path, value })))
        state.outputValues$.push(obs)
        return view
    }

    function groupItems(
            items, 
            configurationBase, 
            basePath: Array<string> = [],
            state: State
            ): VirtualDOM | undefined {

        let currentItems = items.filter(([k, v]: [string, ValueDescription]) => !k.includes(".") && isLeaf(v))

        let children = items
            .filter(item => item[0].includes("."))
            .map(([key, val]) => {
                let prefix = key.split(".")[0]
                let suffix = key.split(".").slice(1).join('.')
                return [prefix, [suffix, val], basePath.concat(prefix)]
            })
            .reduce((acc: any, [prefix, val, basePath]: any) => {
                if (!acc[prefix])
                    acc[prefix] = { values: [], basePath }
                acc[prefix].values.push(val)
                return acc
            }, {})
        
        let r = Object.entries(children)
            .map(([prefix, { values, basePath }]: any) =>{
                return [prefix, groupItems(values, configurationBase, basePath, state)] 
            })
            .filter(([_, groupView]) =>{
                return groupView != undefined 
            })
            .reduce((acc, [k, v]) => {
                return Object.assign({}, acc, { [k]: v }) 
            }, {})
        
        let itemsView = createAttributesGrid(currentItems, basePath, configurationBase, state) || {}
        
        let tabsData = Object.entries(r).map( ([key, val]) => {
            let tabData =  new Tabs.TabData(key,key)
            tabData['view'] = val
            return tabData
        }) 
        if(tabsData.length==0)
            return {
                'class': 'p-2',
                'children': [itemsView]
            }
        let tabState = new Tabs.State(tabsData)
        let tabView = new Tabs.View({
            state: tabState,
            contentView: (_,tabData) => tabData['view'],
            headerView: (_,tabData) => {
                return {innerText: tabData.name, class:`px-2 auto-form-tab-header ${tabData.id}`, title:tabData.name} 
            }
        })
        return {
            'class': 'p-2',
            'children': [
                itemsView,
                tabView
            ]
        }
    }

}