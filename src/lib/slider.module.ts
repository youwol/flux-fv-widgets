import { BuilderView, Flux, Property, RenderView, Schema, ModuleFlux, Pipe,
     freeContract,
     Context} from '@youwol/flux-core'
import { HTMLElement$, render } from "@youwol/flux-view"
import { BehaviorSubject } from 'rxjs'
import { Slider } from '@youwol/fv-input'
import{pack} from './main'
import { distinctUntilChanged, map } from 'rxjs/operators'

/**
  ## Presentation

    A simple slider module that allows to select a number in a range.
    
    > This module is somehow of stateful: the configuration (min, max, value & step properties)
    > that can be provided at run time is kept until a new one is received. 

 ## Resources

 Various resources:
 -    [fv-input](https://github.com/youwol/fv-input):
 the library that provides the underlying implementation
 */
export namespace ModuleSlider{

    let svgIcon =  `<path xmlns="http://www.w3.org/2000/svg" fill="#444444" d="M16 6h-3.6c-0.7-1.2-2-2-3.4-2s-2.8 0.8-3.4 2h-5.6v4h5.6c0.7 1.2 2 2 3.4 2s2.8-0.8 3.4-2h3.6v-4zM1 9v-2h4.1c0 0.3-0.1 0.7-0.1 1s0.1 0.7 0.1 1h-4.1zM9 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3c0 1.7-1.3 3-3 3z"/>`

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
         * Label of the slider
         */
        @Property({ description: "Label of the slider" })
        readonly label: string
      
        /**
         * Current value
         */
        @Property({ description: "Current value" })
        readonly value: number
      
        /**
         * Minimum value
         */
        @Property({ description: "Minimum value" })
        readonly min: number
            
        /**
         * Maximum value
         */
        @Property({ description: "Maximum value" })
        readonly max: number
      
        /**
         * Step count
         */
        @Property({ description: "Step count" })
        readonly stepCount: number
      
        /**
         * If true, output are emitted while dragging the slider 
         */
        @Property({ description: "If true, output are emitted while dragging the slider " })
        readonly emitOnDrag : boolean

        constructor({ label, value, min, max, stepCount, emitOnDrag} : 
            {label?: string, value?: number, min?: number, max?: number, stepCount?: number, emitOnDrag?: boolean}
            = {}) {
          this.label = label != undefined ? label : "slider"
          this.value = value != undefined ? value : 0.5
          this.min = min != undefined ? min : 0.0
          this.max = max != undefined ? max : 1.0
          this.stepCount = stepCount != undefined ? stepCount : 100
          this.emitOnDrag = emitOnDrag != undefined ? emitOnDrag : false
        }
    }

    type TOutput = {value:number, event: MouseEvent, dragging: boolean}

    /** ## Module
     *
     */
    @Flux({
        pack: pack,
        namespace: ModuleSlider,
        id: "ModuleSlider",
        displayName: "Slider",
        description: "A simple slider module that allows to select a number in a range.",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_slider_module.moduleslider.html`
        }
    })
    @BuilderView({
        namespace: ModuleSlider,
        icon: svgIcon
    })
    @RenderView({
        namespace: ModuleSlider,
        render: (mdle: Module) => renderHtmlElement(mdle)
    })
    export class Module extends ModuleFlux {

        readonly output$ : Pipe<TOutput>

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

        lastContextReceived : Context

        constructor( params ){
            super(params)

            this.addInput({
                id:'configuration',
                description: 'Provides a handle to change configuration at run time - the data part of incoming messages is not used.',
                contract: freeContract(),
                onTriggered: ({data, configuration, context}) => {
                    this.lastContextReceived = context
                    this.configurationUpdated(configuration)
                }
            })
            let persistentData = this.getPersistentData<PersistentData>()
            this.configuration$ = new BehaviorSubject<PersistentData>(persistentData)

            this.output$ = this.addOutput({id:"output"})

            // use fake mouse event has none are available
            let initialValue = { value: persistentData.value, event: new MouseEvent("click") }
            this.emitValue(initialValue)
        }

        configurationUpdated( conf:PersistentData ){
            this.configuration$.next(conf)
            // use fake mouse event has none are available
            this.emitValue( {value:conf.value, event:new MouseEvent("click")} )
        }

        emitValue( {value, event} : {value: number, event: MouseEvent} ) {        
            this.output$.next( { data:{value, event, dragging: false}, context: this.lastContextReceived }  )
        }  

        emitValueDragging({value, event} : {value: number, event: MouseEvent}  ) {        
            if(this.getPersistentData<PersistentData>().emitOnDrag )
                this.output$.next( { data:{value, event, dragging: true} , context: this.lastContextReceived } )
        }
    }

    
    export function renderHtmlElement(mdle: Module) : HTMLElement {

        let conf0 = mdle.getPersistentData<PersistentData>()
        let value$ = new BehaviorSubject(conf0.value)
        let state = new Slider.State({
            min: mdle.configuration$.pipe( map((c) => c.min) ),
            max: mdle.configuration$.pipe( map((c) => c.max) ),
            value:  value$,
            count: mdle.configuration$.pipe( map((c) => c.stepCount) ),
        })     
        let view = new Slider.View({
            state, 
            class:'w-100',
            connectedCallback: (element: HTMLElement$) => {

                let s0 = state.data$.subscribe( ({value, event, fromListener}) => {
                    console.log(fromListener)
                    if( fromListener == 'oninput'  )
                        mdle.emitValueDragging({value, event}) 

                    if( fromListener == 'onchange'  )
                        mdle.emitValue({value, event}) 
                })
                let s1 = mdle.configuration$.pipe( map((c) => c.value )
                ).subscribe( v => value$.next(v))

                element.ownSubscriptions(s0,s1)
            }} as any )

        return render(view)
    }
}