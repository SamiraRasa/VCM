sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], (Controller, Filter, FilterOperator, MessageToast, JSONModel) => {
    "use strict";

    return Controller.extend("vcm.controller.Main", {
        onInit() {
            var oRouter = this.getOwnerComponent().getRouter();
        },

        onPress: function () {
            var oModel = this.getOwnerComponent().getModel();
            var oTable = this.getView().byId("documentTable");
            oTable.setVisible(true);

            if (!oModel) {
                console.error("OData model is not available.");
                MessageToast.show("OData model is not available.");
                return;
            }

            var sDocument = this.getView().byId("_IDGenInput2").getValue().trim();
            var aFilters = [];

            if (sDocument) {
                aFilters.push(new Filter({
                    path: "PredDocument",
                    operator: FilterOperator.EQ,
                    value1: sDocument
                }));
            }

            console.log("Applying filters:", aFilters);

            oModel.read("/ZC_IC_HUB_DF", {
                filters: aFilters,
                success: function (oData) {
                    console.log("OData Results:", oData.results);
                    if (oData.results && oData.results.length > 0) {
                        MessageToast.show("Data loaded successfully! Records: " + oData.results.length);
                    } else {
                        // Fallback to client-side filtering
                        oModel.read("/ZC_IC_HUB_DF", {
                            success: function (oDataUnfiltered) {
                                var filteredData = oDataUnfiltered.results.filter(item => item.PredDocument === sDocument);
                                var oJSONModel = new JSONModel();
                                oJSONModel.setData({ ZC_IC_HUB_DF: filteredData });
                                oTable.setModel(oJSONModel);
                                oTable.bindItems({
                                    path: "/ZC_IC_HUB_DF",
                                    template: oTable.getBindingInfo("items").template
                                });
                                MessageToast.show("No data found with server filter. Using client-side filter. Records: " + filteredData.length);
                            },
                            error: function (oError) {
                                console.error("OData Error (unfiltered):", oError);
                                MessageToast.show("Failed to load unfiltered data.");
                            }
                        });
                    }
                },
                error: function (oError) {
                    console.error("OData Error:", oError);
                    MessageToast.show("Failed to load data.");
                }
            });
        },

        onDocPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sGuid = oContext.getProperty("Guid");
            let oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("Details", { id: sGuid });
        }
    });
});