import { BuilderView, Flux, Property, RenderView, Schema, ModuleFlux, Pipe,
    freeContract,
    Context,
    SideEffects} from '@youwol/flux-core'
import { HTMLElement$, render } from "@youwol/flux-view"
import { BehaviorSubject, Subscription } from 'rxjs'
import { Select, Slider } from '@youwol/fv-input'
import{pack} from './main'
import { map } from 'rxjs/operators'

/**
 ## Presentation

   A simple select module that allows to pick an item from a set.
   
   > This module is somehow of stateful: the configuration (items & selectedId)
   > that can be provided at run time is kept until a new one is received. 

## Resources

Various resources:
-    [fv-input](https://github.com/youwol/fv-input):
the library that provides the underlying implementation
*/
export namespace ModuleSelect{

    /**
     * Representation of the Item defined by the user (e.g. [[PersistentData.items]])
     */
    export class Item extends Select.ItemData{

        data: unknown

        constructor({text, id, data}: { text: string, id: string, data: unknown}){
            super(id,text)
            this.data = data
        }
    }

    export let defaultConfigItems = `
/*
The attributes 'text' and 'id' are mandatory, they should be string.
The attribute data is optional, you can bind any data structure.
*/
return [
    {
        text: "option 1",
        id:'option1',
        data: { n : 0 }
    },
    {
        text: "option 2",
        id:'option2',
        data: { n : 1 }
    }
] 
`

    let svgIcon = `<path d="M15 4h-14c-0.6 0-1 0.4-1 1v6c0 0.6 0.4 1 1 1h14c0.6 0 1-0.4 1-1v-6c0-0.6-0.4-1-1-1zM10 11h-9v-6h9v6zM13 8.4l-2-1.4h4l-2 1.4z" ></path>
    <path d="M2 6h1v4h-1v-4z" ></path>`
   /**
    * ## Persistent Data  🔧
    *
    * Persisted properties of the module are the attributes of this object.
    */
   @Schema({
       pack
   })
   export class PersistentData {

        /**
            * Id of the selected item
            */
        @Property({ 
            description: "Id of the selected item" 
            })
        readonly selectedId: string
        
        /**
            * Items definition
            */
        @Property({ 
            description: "Items definition",
            type: 'code'
            })
        readonly items: string | Array<Item>
        
        /**
         * 
         * @returns the resolved [[items]]
         */
        getItems() : Array<Item> {

            if(Array.isArray(this.items))
                return this.items.map( item => new Item(item as any))

            return new Function(this.items)().map( item => new Item(item))
        }


        constructor({items, selectedId } :{ 
            items?: string | Array<Item>, 
            selectedId?:string}= {}
            ) {

            this.items = (items != undefined) ? items : defaultConfigItems
            this.selectedId = (items != undefined) ? selectedId : 'option1'
        }
   }

   /** ## Module
    *
    * Module's presentation is provided [[ModuleSelect | here]]
    */
   @Flux({
       pack: pack,
       namespace: ModuleSelect,
       id: "ModuleSelect",
       displayName: "Select",
       description: "   A simple select module that allows to pick an item from a set.",
       resources: {
           'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_select_module.moduleselect.html`
       }
   })
   @BuilderView({
       namespace: ModuleSelect,
       icon: svgIcon
   })
   @RenderView({
       namespace: ModuleSelect,
       render: (mdle: Module) => renderHtmlElement(mdle)
   })
   export class Module extends ModuleFlux implements SideEffects{

        readonly output$ : Pipe<Item>

        /**
        * Current configuration of the module, can have been changed at run time.
        * 
        * The current configuration is persisted in time, this is either:
        * -    the default one (from [[PersistentData]]) if no run-time overrides have been used
        * -    the last override otherwise 
        * 
        * It is used by the view to update accordingly to configuration updates.
        */
        readonly configuration$ : BehaviorSubject<PersistentData>

        subscription : Subscription
        readonly selectedId$ : BehaviorSubject<string>

        selectState : Select.State
        
        lastContextReceived : Context

        constructor( params ){
            super(params)

            this.addInput({
                id:'configuration',
                description: 'Provides a handle to change configuration at run time - the data part of incoming messages is not used.',
                contract: freeContract(),
                onTriggered: ({ configuration, context}) => {
                    this.lastContextReceived = context
                    this.configurationUpdated(configuration)
                }
            })
            let persistentData = this.getPersistentData<PersistentData>()
            this.selectedId$ = new BehaviorSubject(persistentData.selectedId)
            this.configuration$ = new BehaviorSubject<PersistentData>(persistentData)
            
            this.output$ = this.addOutput({id:"output"})

            this.selectState = new Select.State(
                this.configuration$.pipe( map( (conf) => {
                    let items = conf.getItems() 
                    return items
                })),
                this.selectedId$
            )

            this.selectState.selection$.subscribe( selection => {
                this.output$.next( { data:selection as Item, context: this.lastContextReceived }  )
            })
        }
        
        apply(){
            this.subscription = this.configuration$.subscribe( (conf) => {
                this.selectedId$.next(conf.selectedId)
            })
        }

        dispose(){
            this.subscription.unsubscribe()
        }
        
        configurationUpdated( conf:PersistentData ){
            this.configuration$.next(conf)
            // use fake mouse event has none are available
            // this.emitValue( conf.selectedId )
        }
        /*
        emitValue(selectedId: string | undefined) { 
            if(!selectedId)
                return        
            
            this.output$.next( { data:, context: this.lastContextReceived }  )
        } */
   }

   
   export function renderHtmlElement(mdle: Module) : HTMLElement {

       let view = new Select.View({state: mdle.selectState} as any )
       return render(view)
   }
}