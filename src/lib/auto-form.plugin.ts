import { BuilderView, flattenSchemaWithValue, Flux, freeContract, InputSlot, PluginFlux, Property, 
    RenderView, Schema, SideEffects } from "@youwol/flux-core"
import { BehaviorSubject, combineLatest, merge, Observable, ReplaySubject, Subject, Subscription } from "rxjs"
import { distinct, distinctUntilChanged, map, mergeMap, withLatestFrom } from "rxjs/operators"
import { pack } from "./main"
import {mergeWith, cloneDeep} from 'lodash'
import { AutoForm } from "./auto-form/auto-form.view"
import { HTMLElement$, render, VirtualDOM } from "@youwol/flux-view"

/**
 ## Presentation

   Plugin that exposes some module's configuration in a widget (in the render panel) and allows to update
   configuration at run time.

   It exposes one input for every inputs of the parent module. 
   When an incoming messages reach one input of the plugin, the message is forwarded
   to the related input of the parent module along with the configuration defined by the user
    from the widget.

   A [[PluginAutoForm.PersistentData.triggerPolicy]] allows to control when to forward message
   to the parent module when incoming messages reach the plugin.
*/
export namespace PluginAutoForm {
   
    //Icons made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let icon = `<path d="m459.406 132.927-128.533-128.533c-2.812-2.813-6.628-4.394-10.606-4.394h-216.9c-30.419 0-55.167 24.748-55.167 55.166v401.667c0 30.419 24.748 55.167 55.166 55.167h305.268c30.419 0 55.166-24.748 55.166-55.167v-313.3c0-3.978-1.58-7.793-4.394-10.606zm-124.139-81.714 77.319 77.32h-52.152c-13.877 0-25.167-11.29-25.167-25.167zm73.367 430.787h-305.268c-13.876 0-25.166-11.29-25.166-25.167v-401.667c0-13.876 11.29-25.166 25.166-25.166h201.9v73.366c0 30.419 24.748 55.167 55.167 55.167h73.367v298.3c0 13.877-11.289 25.167-25.166 25.167z"/><path d="m191.733 224.933h-64.267c-8.284 0-15 6.716-15 15v64.267c0 8.284 6.716 15 15 15h64.267c8.284 0 15-6.716 15-15v-64.268c0-8.284-6.715-14.999-15-14.999zm-15 64.267h-34.267v-34.268h34.267z"/><path d="m191.733 353.467h-64.267c-8.284 0-15 6.716-15 15v64.267c0 8.284 6.716 15 15 15h64.267c8.284 0 15-6.716 15-15v-64.267c0-8.284-6.715-15-15-15zm-15 64.266h-34.267v-34.267h34.267z"/><path d="m241 239.933c0 8.284 6.716 15 15 15h64.267c8.284 0 15-6.716 15-15s-6.716-15-15-15h-64.267c-8.284 0-15 6.715-15 15z"/><path d="m384.533 289.2h-128.533c-8.284 0-15 6.716-15 15s6.716 15 15 15h128.533c8.284 0 15-6.716 15-15s-6.716-15-15-15z"/><path d="m256 383.467h64.267c8.284 0 15-6.716 15-15s-6.716-15-15-15h-64.267c-8.284 0-15 6.716-15 15s6.716 15 15 15z"/><path d="m384.533 417.733h-128.533c-8.284 0-15 6.716-15 15s6.716 15 15 15h128.533c8.284 0 15-6.716 15-15s-6.716-15-15-15z"/><path d="m127.467 110.333h80.333c8.284 0 15-6.716 15-15s-6.716-15-15-15h-80.333c-8.284 0-15 6.716-15 15s6.716 15 15 15z"/><path d="m127.467 174.6h128.533c8.284 0 15-6.716 15-15s-6.716-15-15-15h-128.533c-8.284 0-15 6.716-15 15s6.716 15 15 15z"/>`
   
    /**
     * ## TriggerPolicyEnum
     * 
     * Define when to forward message to parent module when an incoming message reach the plugin.
     * See [[PersistentData]]
     */
    export enum TriggerPolicyEnum{
        always = "always",
        applyOnly = "apply only"
    }
    /**
    * ## Persistent Data  🔧
    *
    * Persisted properties of the module are the attributes of this object.
    */
    @Schema({
        pack: pack
    })
    export class PersistentData  {
        
        /**
         * This property control what is happening when incoming messages reach the module:
         * -    'always': incoming messages are directly transferred to 
         * the parent module with the current configuration defined by the plugin
         * -    'applyOnly': incoming messages is 'waiting' in the plugin until
         * the user click 'apply'. At that time the 'waiting' message along with the 
         * configuration is provided to the parent module
         */
        @Property({
            description:'define when the parent module process is triggered when input data arrives',
            enum: Object.values(TriggerPolicyEnum)
        })
        triggerPolicy: TriggerPolicyEnum = TriggerPolicyEnum.always

        /**
         * This property allows to defined default values for the exposed configuration
         * that overrides the static configuration of the parent module. 
         */
        @Property({
            description:'define default value',
            type: 'code'
        })
        defaultValues: string | ( (d: {data, configuration, context}) => {[key:string]: any} ) = `return ({data}) => ({})`

        getDefaultValues( data: any, configuration: any, context:any){

            let getter = typeof this.defaultValues == 'string' 
                ? new Function(this.defaultValues)() 
                : this.defaultValues

            return getter({data, configuration, context})
        }

        /**
         * This property allows to define default data used when no data have reached the module yet.
         * This is usually helpful when a module does not actually need data 
         * (modules defined only by their configuration).
         * Use:
         * -    `return undefined`
         * to enforce waiting for incoming data before sending
         * anything to the parent module
         * -    `return () => ({a:1})` (e.g.) to use {a:1} as 
         * data when pressing 'apply' in the plugin before any data actually reached the module.
         */
        @Property({
            description:'define default data if needed',
            type: 'code'
        })
        defaultData: string | ( (d) => any ) = `return undefined`

        getDefaultData(){

            let getter = typeof this.defaultData == 'string' 
                ? new Function(this.defaultData)() 
                : this.defaultData

            return getter
        }

        /**
         * This property defines which of the attributes of the parent module
         * is exposed. 
         * 
         * It is a function that takes in input the field name, and return true
         * if the property needs to be exposed.
         * 
         * The name of a nested property is as follow: 
         * *    'a.b.c' means the property c of the object b of the object a 
         */
        @Property({
            description: 'Defines input fields included in the widget',
            type:'code'
        })
        includedProperties: string | ( (name: string, description: AutoForm.ValueDescription) => boolean ) = `return (fieldName, metadata) => true`

        getIncludedPropertiesFct() {

            let getter = typeof this.includedProperties == 'string' 
            ? new Function(this.includedProperties)() 
            : this.includedProperties

            return getter
        }

        constructor(params:
            {   triggerPolicy?: TriggerPolicyEnum, 
                defaultValues?: string | ( (d) => {[key:string]: any} ),
                defaultData?: string | ( (d) => any ),
                includedProperties?: string | ( (name: string) => boolean )} = {}) {

            Object.assign(this, params)
        }
    }

    @Flux({
        pack: pack,
        namespace: PluginAutoForm,
        id: "PluginAutoForm",
        displayName: "AutoForm",
        description: "Automatic widget generation",
        compatibility: {
            "Can be applied to any widget": (mdle) => true,
        },
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_auto_form_plugin.pluginautoform.html`
        }
    })
    @BuilderView({
        namespace: PluginAutoForm,
        icon: icon
    })
    @RenderView({
        namespace: PluginAutoForm,
        render: (mdle) => renderHtmlElement(mdle as Module)
    })
    export class Module extends PluginFlux<Module>  implements SideEffects {

        subscriptions = new Array<Subscription>()

        configurationOut$ : BehaviorSubject<PersistentData>
        configurationIn$ : BehaviorSubject<PersistentData>
        currentAutoFormState = {}

        constructor(params) { 
            super(params) 

            this.configurationOut$ = new BehaviorSubject(this.parentModule.configuration.data)
            this.configurationIn$ = new BehaviorSubject(this.parentModule.configuration.data)

            let conf = this.getPersistentData<PersistentData>()
            
            this.parentModule.inputSlots.forEach((inputSlot: InputSlot, i: number) => {

                let defaultData = conf.getDefaultData()

                let data$ = defaultData 
                    ? new BehaviorSubject<{data:any, context:any}>({data:defaultData(), context: undefined})
                    : new ReplaySubject<{data:any, context:any}>(1)

                let sub = (conf.triggerPolicy == TriggerPolicyEnum.always )
                    ?   combineLatest([
                            data$, 
                            this.configurationOut$.pipe(
                                distinctUntilChanged((prev, curr) => JSON.stringify(prev)===JSON.stringify(curr))
                                )]
                            ).subscribe(
                            ( [{data, context}, configuration]) => {
                                this.dispatch(i,data,configuration,context)
                        })
                    :   this.configurationOut$.pipe( withLatestFrom(data$)).subscribe(
                            ([configuration,{data, context}]) => {
                                this.dispatch(i,data,configuration,context) 
                        })

                this.subscriptions.push(sub)

                this.addInput({
                    id:"dispatch_" + inputSlot.slotId,
                    contract: freeContract(),
                    onTriggered: ({data, context}) => {
                        let defaultDynValues = conf.getDefaultValues(data, conf, context)
                        let defaultValues =  cloneDeep(this.parentModule.configuration.data)
                        mergeWith( defaultValues, this.currentAutoFormState,  defaultDynValues)
                        this.configurationIn$.next(defaultValues)
                        data$.next({data, context})
                    }
                })
            })
        }

        dispatch(index, data, configuration, context){
            context && context.info(`Dispatch data on parent's output ${index}`, {data, configuration, userContext:context})
            this.parentModule.inputSlots[index].subscribeFct({message:{data,configuration, context}, connection: undefined})
        }

        apply(){}

        dispose() {
            this.subscriptions.map( s => s.unsubscribe())
        }
    }
    
    function renderHtmlElement(mdle: Module) {

        let schemaWithValue = flattenSchemaWithValue(mdle.parentModule.configuration.data)
        Object.keys(schemaWithValue).forEach( k => schemaWithValue[k] = schemaWithValue[k][0])

        let state = new AutoForm.State(
            mdle.configurationIn$, 
            schemaWithValue as any,
            mdle.getPersistentData<PersistentData>().getIncludedPropertiesFct()
            )
        
        if(mdle.getPersistentData<PersistentData>().triggerPolicy == TriggerPolicyEnum.applyOnly){

            let apply$ = new Subject<MouseEvent>()
            let sub = apply$.pipe(
                withLatestFrom(state.currentValue$)
            ).subscribe( ([_,values]) => {
                mdle.configurationOut$.next( new PersistentData(values))
            })

            let applyView : VirtualDOM = {
                class:'d-flex fv-text-focus fv-pointer fv-color-primary align-items-center p-2 fv-hover-bg-background-alt auto-form-apply', 
                children:[
                    { tag:'i', class: 'fas fa-play-circle px-2'},
                    { innerText:'apply'}
                ],
                onclick: (ev) => {
                    apply$.next(ev)
                }
            }

            let view : VirtualDOM = {
                class:'fv-bg-background fv-text-primary h-100 d-flex flex-column',
                children:[
                    applyView,
                    new AutoForm.View({state, class:'flex-grow-1 overflow-auto', style:{'min-height':'0px'}} as any)
                ],
                connectedCallback: (elem: HTMLElement$) => {
                    elem.ownSubscriptions(sub)
                }
            }
            return  render(view)
        }

        let sub = state.currentValue$.subscribe( values => {
            mdle.currentAutoFormState = values
            mdle.configurationOut$.next( new mdle.parentModule.Factory.PersistentData(values))
        })
        let view : VirtualDOM = {
            class:'fv-bg-background fv-text-primary h-100 d-flex flex-column',
            children:[
                new AutoForm.View({state, class:'flex-grow-1 overflow-auto', style:{'min-height':'0px'}} as any)
            ],
            connectedCallback: (elem: HTMLElement$) => {
                elem.ownSubscriptions(sub)
            }
        }
        return  render(view)
    }
}