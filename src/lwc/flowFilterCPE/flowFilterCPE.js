/**
 * Created by bswif on 12/27/2022.
 */

 /*
    TODO
        [x] add error to field config modal
        [x] try catch handleUpdateFldName and drag/drop functions
        [x] lock field name in table
        [x] hover icon on table row
        [x] modal min height
        [x] fld attributes in table only
        [x] drag and drop doesn't go down and pulls to 0
        [x] probably don't need the title attribute for sorting
        [x] remove on all table rows
        [x] spinner on list select not working
        [x] consider disabling allow filter and sort on references
        [x] some drag styling on tr
        [x] save output variables for reloading cpe
        [x] add inline editing note: flow needs to complete updates
 */

import { LightningElement, track, api } from 'lwc';
import getObjects from '@salesforce/apex/flowFilterCTRL.getObjects'
import getFields from '@salesforce/apex/flowFilterCTRL.getFields';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class FlowFilterCpe extends LightningElement {
    @track fldList;//field data returned from Apex
    varObjMap = new Map();//map flow vars to object names and use to get sobject
    fldLabelMap = new Map();//map field names to labels to default label on field select
    fldInfoMap = new Map();//map field names to field info
    objLabelMap = new Map();//map object names to labels for collection labels
    @track showErr;//boolean to track errors
    @track dragStart;//dragging field columns
    @track fldOpts;//list of field options for picklist
    @track recListOpts;//list of record list variables from flow

    @track showFldConfigButton = false;//boolean to show field config button
    @track showFldConfig = false;//boolean to open/close field config modal
    @track tempFld;//temp object to hold field info before adding to list
    @track flds;//submitted fields from field config modal
    @track _flds;//local array of flds for edits
    @track dragStart;//track dragging field order
    @track seletedRow;//selected row for dragging

    @track isLoading = true;//boolean to clear when variables have loaded
    @track isSubmitting = false;//set true during submissions

    @api builderContext; //flow builder context with variables, collections, etc...

    //get and set flow input variables
    _inputVariables = [];
    @api
    get inputVariables(){
        return this._inputVariables;
    }
    set inputVariables(value){
        this._inputVariables = value || [];
    }

    //get objName input variable
    get objName(){
        const inputParam = this.inputVariables.find(({name}) => name === 'objName');
        if(inputParam){
            return inputParam && inputParam.value;
        }
    }

    //get recList input variable
    get recList(){
        const inputParam = this.inputVariables.find(({name}) => name === 'recList');
        if(inputParam){
            return inputParam && inputParam.value;
        }
    }

    //get allowSelect input variables
    get allowSelect(){
        const inputParam = this.inputVariables.find(({name}) => name === 'allowSelect');
        return inputParam && inputParam.value;
    }

    //get returnUpdatedRecs input variables
    get returnUpdatedRecs(){
        const inputParam = this.inputVariables.find(({name}) => name === 'returnUpdatedRecs');
        return inputParam && inputParam.value;
    }

    //get returnUpdatedRecs input variables
    get includeBackButton(){
        const inputParam = this.inputVariables.find(({name}) => name === 'includeBackButton');
        return inputParam && inputParam.value;
    }

    //get fldListJSON input variables
    get fldListJSON(){
        const inputParam = this.inputVariables.find(({name}) => name === 'fldListJSON');
        return inputParam && inputParam.value;
    }

    //spinner
    get showSpinner(){
        return this.showErr==false && (this.isLoading || this.isSubmitting);
    }

    //run on load
    connectedCallback(){
        try{
            //if we have fldListJSON from input, parse into array for modal
            if(this.fldListJSON){
                this.flds = JSON.parse(this.fldListJSON);
            }else if(!(this.flds)){//otherwise, instantiate flds array for modal
                 this.flds=[];
                 this.tempFld={
                     fldName:''
                };
            }

            //we have have objName for input, get fields
            if(this.objName){
                this.handleObjChange(this.objName);
            }

            //call set recLists to build reclistOpts for combobox
            this.setRecLists();
        }catch(e){
            this.logErr(e,'error on callback');
        }
    }

    //set recListOpts
    setRecLists(){
        try{
            let recLists = [];//array of record collections from flow
            let objNames = [];//array of sobject names from flow record collections

            //check variables for record collections
            for(let theElmt of this.builderContext.variables){
                if(theElmt.dataType == 'SObject' && theElmt.isCollection){
                    recLists.push(
                        {
                            sObject: theElmt.objectType,
                            varName: theElmt.name,
                            theVar: theElmt
                        }
                    );
                    //add to objNames to get labels
                    if(!objNames.includes(theElmt.objectType)) objNames.push(theElmt.objectType);
                }
            }

            //check record lookups for record collections
            for(let theElmt of this.builderContext.recordLookups){
                recLists.push(
                    {
                        sObject: theElmt.object,
                        varName: theElmt.name,
                        theVar: theElmt
                    }
                );
                //add to objNames to get labels
                if(!objNames.includes(theElmt.object)) objNames.push(theElmt.object);
           }

            //get object information for sobjects
            getObjects({objNames: objNames})
            .then(result => {
                //pass sobject label/names into map
                for(let theOpt of result){
                    this.objLabelMap.set(theOpt.objName,theOpt.objLabel);
                }

                //set options for recList combobox (use object label from map for label)
                this.recListOpts = [];
                for(let theList of recLists){
                    this.recListOpts.push(
                        {
                            label: `${this.objLabelMap.get(theList.sObject)}s from ${theList.varName}`,
                            value: theList.varName
                        }
                    );
                    this.varObjMap.set(theList.varName,theList.sObject);//set varObjMap
                }

                //show error if there are no valid collection variables
                if(this.recListOpts.length == 0){
                    let errMsg = 'This component requires at least one SObject collection variable';
                    this.showTst('Error', errMsg, 'error', 'sticky');
                    this.showErr = true;
                }else{
                    //this.setIsLoading();
                    this.showErr = false;
                    this.isLoading = false;
                }
            })
            .catch(e => {
                this.logErr(e,'error getting objects');
            });
        }catch(e){
            this.logErr(e,'error on setRecLists');
        }
    }

    //handle changing the recList input and sending update to parent
    handleRecListChange(event){
        try{
            if (event && event.detail) {
                this.isLoading = true;

                //if the new collection is a different sobject
                if(this.objName != this.varObjMap.get(event.detail.value)){
                    //clear submitted fields
                    this.flds = [];
                    //call method updating available fields and sending objName and objType to parent
                    this.handleObjChange(this.varObjMap.get(event.detail.value));
                }

                //send new record collection to parent
                const newValue = event.detail.value;
                this._dispatchInputChanged('recList',newValue,'reference');
            }
        }catch(error){
            this.logErr(error,'error on handleRecListChange');
        }
    }

    //handle changing sObject, clearing variables as needed
    handleObjChange(newObjName){
        this.showFldConfigButton = false;
        //set object name
        const newObj = newObjName;
        //get available fields for sobject and set in maps and option array
        getFields({objName: newObj})
        .then(result => {
            for(let theFld of result){
                this.fldLabelMap.set(theFld.fldName,theFld.fldLabel);
                this.fldInfoMap.set(theFld.fldName,theFld);
            }
            this.fldOpts = [];
            console.log('got flds');
            console.log(this.fldInfoMap);
            for(let theFld of result){
                this.fldOpts.push(
                    {
                        label: theFld.fldLabel,
                        value: theFld.fldName
                    }
                );
            }
            //send updated input property to parent lwc
            this._dispatchInputChanged('objName',newObj,'String');

            //send updated input type property to parent lwc
            const typeChangedEvent = new CustomEvent(
                'configuration_editor_generic_type_mapping_changed',
                {
                    bubbles: true,
                    cancelable: false,
                    composed: true,
                    detail: {
                        typeName: 'theObj',
                        typeValue: newObj
                    },
                }
            );
            this.dispatchEvent(typeChangedEvent);
            this.setIsLoading();
            this.isLoading = false;
            this.showFldConfigButton = true;
        })
        .catch(error => {
            this.logErr(error,'error getting fields');
        });
    }

    //handle changing Boolean input and sending update to parent
    handleBooleanInputChange(event){
        try{
            if(event && event.detail){
                let inputName = event.target.name;
                const newValue = event.target.checked;
                this._dispatchInputChanged(inputName,newValue,'Boolean');
            }
        }catch(e){
            this.logErr(e,'error on handleBooleanInputChange')
        }
    }

    //handle field selection
    handleUpdateFldName(event){
        try{
            this.tempFld.fldName = event.target.value;
        }catch(e){
            this.logErr(e,'error on handleUpdateFldName');
        }
    }

    //handle adding a field
    handleAddFld(event){
        try{
            //check that field is populated
            let fldValid = true;
            let nameInput = this.template.querySelector('.fldName');
            nameInput.setCustomValidity('');
            if(!(this.tempFld.fldName)){
                fldValid = false;
                nameInput.setCustomValidity('A field is required');
                nameInput.reportValidity();
            }else{
                //validate that they're not entering the same field twice
                let dupeFld = false;
                for(let theFld of this._flds){
                    if(theFld.fldName == this.tempFld.fldName){
                        dupeFld = true;
                        break;
                    }
                }
                if(dupeFld){
                    nameInput.setCustomValidity('You\'ve already added this field');
                    fldValid = false;
                    nameInput.reportValidity();
                }
            }

            if(fldValid){
                //set field details and add to list
                this.tempFld.theIndex = this._flds.length;
                this.tempFld.dispLabel = this.fldLabelMap.get(this.tempFld.fldName);
                this.tempFld.fldType = this.fldInfoMap.get(this.tempFld.fldName).fldType;
                this.tempFld.pickVals = (this.fldInfoMap.get(this.tempFld.fldName).pickVals)? this.fldInfoMap.get(this.tempFld.fldName).pickVals : null;
                this.tempFld.isRef = this.fldInfoMap.get(this.tempFld.fldName).fldType == 'reference';
                this._flds.push(Object.assign({},this.tempFld));
                this.tempFld = {
                         fldName:''
                };
            }
        }catch(e){
            this.logErr(e,'error on handleAddFld');
        }
    }

    //handle removing a field
    handleRemoveFld(event){
        try{
            if(event && event.detail){
                const theIndex = event.target.dataset.index;
                this._flds.splice(theIndex,1);

                for(let i = 0; i < this._flds.length; i++){
                    this._flds[i].theIndex = i;
                }
            }
        }catch(e){
            this.logErr(e,'error on handleRemoveFld');
        }
    }

    //handle updating a field
    handleUpdateFld(event){
        try{
            if (event && event.detail){
                const theIndex = event.target.dataset.index;
                this._flds[theIndex][event.target.name] = (event.target.type == "checkbox")? event.target.checked : event.target.value;
            }
        }catch(e){
            this.logErr(e,'error on handleUpdateFld');
        }
    }

    //handle resorting fields
    //https://www.salesforcebolt.com/2021/10/drag-and-drop-in-lightning-web-component.html
    DragStart(event){
        try{
            this.dragStart = event.target.dataset.index;
            this.selectedRow = event.target;
            this.selectedRow.classList.add('drag');
            this.selectedRow.classList.add('dragStyle');
        }catch(e){
            this.logErr(e,'error on DragStart');
        }
    }

    DragOver(event){
        event.preventDefault();
        return false;
    }

    Drop(event){
        this.selectedRow.classList.remove('dragStyle');
        event.stopPropagation();
        const DragValName = this.dragStart;
        const DropValName = event.target.dataset.index;
        if(DragValName === DropValName){
            return false;
        }
        const index = DropValName;
        const currentIndex = DragValName;
        const newIndex = DropValName;
        Array.prototype.move = function(from,to){
            this.splice(to,0,this.splice(from,1)[0]);
        };
        this._flds.move(currentIndex,newIndex);
        for(let i = 0; i < this._flds.length; i++){
            this._flds[i].theIndex = i;
        }
    }

    //handle submitting field list
    handleSubmitFlds(event){
        try{
            this.isSubmitting = true;
            this.flds = this._flds;
            let inlineEdit = false;
            for(let theFld of this.flds){
                if(theFld.allowEdit){
                    inlineEdit = true;
                    break;
                }
            }

            if(inlineEdit){
                let tstMsg = 'Inline edits submitted by end users won\'t be committed to the database. You will need to assign them to a record collection element and update them in the Flow';
                this.showTst('Warning',tstMsg,'warning','sticky');
            }

            const jsonString = JSON.stringify(this.flds);
            this._dispatchInputChanged('fldListJSON',jsonString,'String');
            this.toggleShowFldConfig();
            this.isSubmitting = false;
        }catch(e){
            this.logErr(e,'error on handleSubmitFlds');
        }
    }

    //validation method, runs when "Done" is clicked in the lwc config
    @api
    validate(){
        try{
            //check required fields and SObject fields
            const validity = [];

            const fldsValid = [...this.template.querySelectorAll('lightning-input,lightning-combobox')]
                             .reduce((validSoFar, inputCmp) => {
                                 inputCmp.reportValidity();
                                 return validSoFar && inputCmp.checkValidity();
                             }, true);

            if(!fldsValid){
                validity.push({
                    key: 'Missing Required Fields',
                    errorString: 'You are missing one or more required fields'
                })
            }else if(!(this.flds) || this.flds.length == 0 || !(this.flds[0].fldName)){
                validity.push({
                    key: 'Missing SObject Fields',
                    errorString: 'Add SObject Fields'
                })
            }
            return validity;
        }catch(e){
            this.logErr(e,'error on validate')
        }
    }


    //function to send input property updates to parent lwc
    _dispatchInputChanged(name,newValue,dataType){
        this.dispatchEvent(new CustomEvent(
            'configuration_editor_input_value_changed', {
                bubbles: true,
                cancelable: false,
                composed: true,
                detail: {
                    name: name,
                    newValue: newValue,
                    newValueDataType: dataType
                }
            }
        ));
    }

    //set is loading to false once recListOpts and objName/fldOpts have loaded
    setIsLoading(){
        this.isLoading = (!(this.recListOpts) || (this.objName && !(this.flds)));
    }

    //toggle field config modal
    toggleShowFldConfig(){
        try{
            this.showFldConfig = !this.showFldConfig;
            this.tempFld={
                 fldName:''
            };
            this._flds = [];
            if(this.showFldConfig){
                for(let theFld of this.flds){
                    this._flds.push(Object.assign({},theFld));
                }
            }
        }catch(error){
            logErr(error, 'error on toggleAddFld');
        }
    }

    //function to log errors from try/catches
    logErr(error,logMsg){
        console.log('caught err');
        console.log(logMsg);
        console.log(error.message);
        console.log(error);
        let errMsg = `${logMsg} : ${error.message}`;
        this.isLoading = false;
        this.isSubmitting = false;
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