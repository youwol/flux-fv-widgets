import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs'

import { map, tap } from 'rxjs/operators'
import { Switch } from '@youwol/fv-button'
import { TextInput, NumberInput} from '@youwol/fv-input'
import { Tabs } from '@youwol/fv-tabs'
import { child$, HTMLElement$, VirtualDOM } from '@youwol/flux-view'
import {cloneDeep} from 'lodash'

export namespace AutoForm {

    type ValueDescription = { name: string, type: string, metadata: any }
    type ValueType = number | string | boolean

    export interface Schema {

        [key: string]: ValueDescription
    }

    export class State {

        formDescription$: BehaviorSubject<Object>
        currentValue$ : BehaviorSubject<Object>

        constructor(formDescription$: BehaviorSubject<Object> | Object, public readonly schema: Schema) {
            this.formDescription$ = (formDescription$ instanceof BehaviorSubject)
            ? formDescription$ 
            : new BehaviorSubject<Object>(formDescription$ as Object)

            this.currentValue$ = new BehaviorSubject(this.formDescription$.getValue())
        }
    }

    let viewFactory = [
        {
            test: (value: ValueDescription) => value.type == "Boolean",
            view: (value: any) => new Switch.View({
                state: new Switch.State(value)
            })
        },
        {
            test: (value: ValueDescription) => value.type == "String",
            view: (value: any) => new TextInput.View({
                state: new TextInput.State(value)
            })
        },
        {
            test: (value: ValueDescription) => value.type == "Number",
            view: (value: any) => new NumberInput.View({
                state:new NumberInput.State(value) 
            })
        }
    ]

    export class View implements VirtualDOM {

        public readonly state: State

        children : Array<VirtualDOM>

        constructor({state, ...rest} : {state: State}) {
            Object.assign(this, rest)
            this.state = state
            let observables : Array<Observable<{path:Array<string>,value:ValueType}>>

            this.children = [
                child$( 
                    state.formDescription$.pipe(
                        tap( () =>  observables = new Array<Observable<{path:Array<string>,value:ValueType}>>() )
                    ),
                    (formDescription) => groupItems( Object.entries(state.schema), formDescription, observables),
                    {
                        sideEffects: (_, elem: HTMLElement$) => {
                            let sub = combineLatest( observables ).subscribe( entries => {
                                let base = cloneDeep(state.formDescription$.getValue())
                                entries.forEach( ({path, value}) => {
                                    let lastPart = path.slice(-1)[0]
                                    let parentParts = path.slice(0,-1)
                                    parentParts.reduce( (acc,e) => acc[e], base )[lastPart] = value
                                })
                                state.currentValue$.next(base)
                            })
                            elem.ownSubscriptions(sub)
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
        observables: Array<Observable<{path:Array<string>,value:ValueType}>> 
        ) : VirtualDOM{

        if (items.length == 0) 
            return {}

        return {
            class:'row', style:{'font-size': 'smaller', padding:'0px', margin:'0px'},
            children: items.map( item => [
                {
                    class:'col',
                    innerText: item[0]
                },
                {
                    class:'col', style:{ 'align-self': 'center' },
                    children: [
                        leafView(item[1], basePath.concat(item[0]), configurationBase, observables)
                    ]
                },
                {   class:"w-100 py-1"}
            ]).reduce((acc,e)=> acc.concat(e))
        }
    }
    function isLeaf(v: ValueDescription) {
        return v.type && ["Number", "String", "Boolean"].includes(v.type)
    }

    function leafView(
        valueMeta: ValueDescription, 
        path: Array<string>, configuration, 
        observables: Array<Observable<{path:Array<string>,value:ValueType}>>
        ): VirtualDOM {

        let value0 = path.reduce((acc, e) => acc[e], configuration)
        let factory = viewFactory.find(element => element.test(valueMeta))
        if(! factory)
            return { id:'unkwnown-element-'+ valueMeta.name+'-'+valueMeta.type}
        let view = factory.view(value0 as any);
        let obs = (view.state.value$ as Observable<any>).pipe(map(value => ({ path, value })))
        observables.push(obs)
        return view
    }

    function groupItems(
            items: Array<[string, ValueDescription]>, 
            configurationBase, 
            observables: Array<Observable<{path:Array<string>,value:ValueType}>>,
            basePath: Array<string> = []
            ): VirtualDOM {

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
            .map(([prefix, { values, basePath }]: any) => [prefix, groupItems(values, configurationBase, observables, basePath)])
            .reduce((acc, [k, v]) => Object.assign({}, acc, { [k]: v }), {})
        
        let itemsView = createAttributesGrid(currentItems,basePath,configurationBase,observables)
        
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
            headerView: (_,tabData) => ({innerText: tabData.name, class:'px-2'})
        })
        let data = {
            'class': 'p-2',
            'children': [
                itemsView,
                tabView
            ]
        }
        return data
    }

}