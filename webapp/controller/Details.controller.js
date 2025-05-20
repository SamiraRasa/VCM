sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat"
], function(Controller, JSONModel, DateFormat) {
    "use strict";

    return Controller.extend("vcm.controller.Details", {
        onInit: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("Details").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function(oEvent) {
            var sGuid = oEvent.getParameter("arguments").id;
            var oModel = this.getOwnerComponent().getModel();
            oModel.read("/ZC_IC_HUB_DF(Guid=guid'" + sGuid + "',IsActiveEntity=true)", {
                success: function(oData) {
                                     
                    var aHierarchicalData = [
                        {
                           
                            PredDocument: oData.PredDocument,
                            PredObjectType: oData.PredObjectType,
                            PredSystem: oData.PredSystem,
                            PredDocumentItem: oData.PredDocumentItem,
                                                 
                            children: [
                                {
                                    SuccDocument: oData.SuccDocument,
                                    SuccObjectType: oData.SuccObjectType,
                                    SuccSystem: oData.SuccSystem,
                                    SuccDocumentItem: oData.SuccDocumentItem
                                }
                            ]
                        }
                    ];

                    var oDetailModel = new JSONModel(aHierarchicalData);
                    this.getView().setModel(oDetailModel, "detailModel");
                    sap.m.MessageToast.show("Detail data loaded successfully!");
                }.bind(this),
                error: function(oError) {
                    console.error("Error fetching detail data:", oError);
                    sap.m.MessageToast.show("Failed to load detail data: " + oError.message);
                }
            });
        }
    });
});