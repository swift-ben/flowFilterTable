/**
 * Created by bswif on 12/27/2022.
 */

 /*
    TODO
        [] test datetime
        [x] send list of only filtering fields to flowFilterFilterPanel
        [] styling (labels, button, explainer, etc...)
        [] configure isLoading
            - filters loading
            - table loading
            - filters applying
        [] test access
            - if locked down, add apex soql and try that
        [x] test without inline editing or select enabled
        [] consider custom display instead of datatable
            - more styling flexibility
            - lookups
            - permissions flexibility
        [] consider collapsable filters
        [x] handle flow next
        [x] handle inline editing
            -return to flow in separate list
        [x] handle select
            - return to flow in separate list
        [x] include conditional previous
            [] test
        [x] optionally return solely edited recs
            [] test

 */

import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import { FlowNavigationBackEvent } from 'lightning/flowSupport';

export default class FlowFilterCmp extends LightningElement {
    @api objName;//name of SObject passed from CPE and used in updates for inline
    @api recList;//list of records passed from flow, returned with edits
    @api selectedRecList;//list of records selected by User
    @track _recList;//list or records to pass to and from flowFilterTable (isSelected and inline updates)
    @api allowSelect;//allow row select in flowfilterTable
    @api returnUpdatedRecs;//return only updated Records vs all Records
    @api includeBackButton;//include a button to go back in the Flow
    @api fldListJSON;//json of field data passed form CPE
    @track fldList;//constructed list of field data to pass to and from child components
    @track filterFlds;//array of filterable fields
    @track isLoading;//true while filtering or loading data

    //run on load
    connectedCallback(){
        try{
            this.fldList = [];
            this.filterFlds = [];
            for(let fld of JSON.parse(this.fldListJSON)){
                this.fldList.push(fld);
                if(fld.allowFilter){
                    this.filterFlds.push(fld);
                }
            }
        }catch(e){
            this.logErr(e,'error on callback')
        }
    }

    //function to handle updates to filters
    handleFilterUpdate(event){
        try{
            this.template.querySelector('c-flow-filter-table').setFilteredList(event.detail.fldList);
        }catch(e){
            this.logErr(e,'error on handleFilterUpdate');
        }
    }

    //function on next: return selected rows and go to next in flow
    handleNext(event){
        try{
            let tableData = this.template.querySelector('c-flow-filter-table').returnData();
            this.recList = tableData.theRecs;
            this.selectedRecList = tableData.selectedRecs;
            const navigateNextEvent = new FlowNavigationNextEvent();
            this.dispatchEvent(navigateNextEvent);
        }catch(e){
            this.logErr(e,'error on handleNext');
        }
    }

    //function on back
    handleBack(event){
        try{
            const navigateBackEvent = new FlowNavigationBackEvent();
            this.dispatchEvent(navigateBackEvent);
        }catch(e){
            this.logErr(e,'error on handleBack');
        }
    }

    //log an error
    logErr(error,logMsg){
        console.log('caught err');
        console.log(logMsg);
        console.log(error.message);
        console.log(error);
        let errMsg = `Something went wrong. Error: \n\n ${logMsg} \n\n ${error.message}`;
        this.showTst('Error',errMsg,'error','sticky');
    }

    //show a message
    showTst(t,m,v,md){
        const event = new ShowToastEvent({
            title: t,
            message: m,
            variant: v,
            mode: md
        });
        this.dispatchEvent(event);
    }
}