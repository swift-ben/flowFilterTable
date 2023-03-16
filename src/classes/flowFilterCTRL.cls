/**
 * Created by bswif on 12/27/2022.
 */

public with sharing class flowFilterCTRL {
    //get object data for CPE
    @AuraEnabled
    public static List<ObjectWrapper> getObjects(List<String> objNames){
        List<ObjectWrapper> theObjs = new List<ObjectWrapper>();
        for(String objName : objNames){
            String objLabel = Schema.getGlobalDescribe().get(objName).getDescribe().getLabel();
            theObjs.add(new ObjectWrapper(objName,objLabel));
        }
        theObjs.sort();
        return theObjs;
    }

    //get field data for CPE, excludes TEXTAREA, TIME, ADDRESS among others
    @AuraEnabled
    public static List<FieldWrapper> getFields(String objName){
        Map<DisplayType,String> typeMap = new Map<DisplayType,String>{
            DisplayType.PICKLIST => 'picklist',
            DisplayType.CURRENCY => 'currency',
            DisplayType.EMAIL => 'email',
            DisplayType.MULTIPICKLIST => 'picklist',
            DisplayType.PERCENT => 'percent',
            DisplayType.PHONE => 'phone',
            DisplayType.REFERENCE => 'reference',
            DisplayType.URL => 'url',
            DisplayType.DATE => 'date-local',
            DisplayType.DATETIME => 'date-local',
            DisplayType.STRING => 'text',
            DisplayType.DOUBLE => 'number',
            DisplayType.COMBOBOX => 'text',
            DisplayType.BOOLEAN => 'boolean',
            DisplayType.INTEGER => 'number'
        };

        List<FieldWrapper> theFlds = new List<FieldWrapper>();

        for(Schema.SObjectField theFld : Schema.getGlobalDescribe().get(objName).getDescribe().fields.getMap().values()){
            DisplayType theType = theFld.getDescribe().getType();
            if(typeMap.containsKey(theType)){
                String fldType = typeMap.get(theFld.getDescribe().getType());
                String fldLabel = theFld.getDescribe().getLabel();
                String fldName = theFld.getDescribe().getName();
                List<OptionWrapper> pickVals;
                if(fldType == 'picklist'){
                    pickVals = new List<OptionWrapper>();
                    theFld.getDescribe().getPicklistValues();
                    for(Schema.PicklistEntry theEntry : theFld.getDescribe().getPicklistValues()){
                        pickVals.add(new OptionWrapper(theEntry.getLabel(),theEntry.getValue()));
                    }
                }
                theFlds.add(new FieldWrapper(fldName,fldLabel,fldType,pickVals));
            }
        }

        theFlds.sort();
        return theFlds;
    }

    public class ObjectWrapper implements Comparable{
        @AuraEnabled
        public String objName;
        @AuraEnabled
        public String objLabel;

        public ObjectWrapper(String objName, String objLabel){
            this.objName = objName;
            this.objLabel = objLabel;
        }
        public Integer compareTo(Object compareTo) {
            ObjectWrapper compareToObj = (ObjectWrapper) compareTo;
            if (objLabel == compareToObj.objLabel) return 0;
            if (objLabel > compareToObj.objLabel) return 1;
            return -1;
        }
    }
    public class FieldWrapper implements Comparable{
        @AuraEnabled
        public String fldName;
        @AuraEnabled
        public String fldLabel;
        @AuraEnabled
        public String fldType;
        @AuraEnabled
        public List<OptionWrapper> pickVals;

        public FieldWrapper(String fldName,String fldLabel, String fldType, List<OptionWrapper> pickVals){
            this.fldName = fldName;
            this.fldLabel = fldLabel;
            this.fldType = fldType;
            this.pickVals = pickVals;

        }

        public Integer compareTo(Object compareTo) {
            FieldWrapper compareToFld = (FieldWrapper) compareTo;
            if (fldLabel == compareToFld.fldLabel) return 0;
            if (fldLabel > compareToFld.fldLabel) return 1;
            return -1;
        }
    }

    public class OptionWrapper{
        @AuraEnabled
        public String label;
        @AuraEnabled
        public String value;

        public OptionWrapper(String label, String value){
            this.label = label;
            this.value = value;
        }
    }
}