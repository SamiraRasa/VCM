sap.ui.define(
  [
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/mvc/Controller",
    "sap/f/library",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
  ],
  function (JSONModel, Controller, fioriLibrary, MessageBox, BusyIndicator) {
    "use strict";

    // shortcut for sap.f.LayoutType
    var LayoutType = fioriLibrary.LayoutType;

    return Controller.extend("phoron.prototype.controller.List", {
      onInit: function () {
        this.oRouter = this.getOwnerComponent().getRouter();

        this._objectTypeLabels = {
          PO: "Purchase Order",
          SO: "Sales Order",
          OD: "Outbound Delivery",
          BD: "Billing Document",
          MD: "Material Document",
          ID: "Inbound Delivery",
          SI: "Supplier Invoice"
        };
        this._sourceSystLabels = {
          S1: "ECC",
          S2: "S/4 private",
          S3: "S/4 public"
        }

        const that = this

        this.getOwnerComponent()
          .getService('ShellUIService')
          .then(function (oShellService) {
            oShellService.setBackNavigation(function () {
              that._navBack();
            });
          });
      },

      onSearch: function (oEvent) {

        BusyIndicator.show(0);
        
        this.getView().getModel("odataModel").read("/DocumentFlow", {
          success: function (oData) {
            const oLocalModel = this.getView().getModel("localModel");
            const sDoc = this.byId("docIdInput").getValue();
            const sDocType = this.byId("docTypeSelect").getSelectedKey();
            const sSourceSyst = this.byId("sourceSystSelect").getSelectedKey();

            oLocalModel.setProperty("/DocumentFlow", oData.results);
            oLocalModel.setProperty("/DocumentList", this._listAllDocuments(oData.results, sDoc, sDocType, sSourceSyst));
            oLocalModel.setSizeLimit(1000);

            BusyIndicator.hide();
          }.bind(this)
        });
      },

      onListItemPress: function (oEvent) {
        const documentPath = oEvent.getSource().getSelectedItem().getBindingContext("localModel").getPath();
        const oDocument = this.getView().getModel("localModel").getProperty(documentPath);
        const document = oDocument.Document;

        this.oRouter.navTo("detail", { layout: LayoutType.OneColumn, document: document });
      },

      _navBack: function () {
        this.oRouter.navTo("list", {}, true);
      },

      _listAllDocuments: function (documentLinks, rootDocument, rootDocumentType, rootSystem) {
        const filteredLinks = documentLinks.filter(link =>
          (rootDocument === '' || link.PredDocument === rootDocument || link.SuccDocument === rootDocument) &&
          (rootDocumentType === '' || link.PredObjectType === rootDocumentType || link.SuccObjectType === rootDocumentType) &&
          (rootSystem === '' || link.PredSystem === rootSystem || link.SuccSystem === rootSystem)
        );

        const documents = new Map();

        filteredLinks.forEach(link => {
          const predKey = `${link.PredDocument}`;
          if (!documents.has(predKey) && (rootDocument === '' || predKey === rootDocument)) {
            documents.set(predKey, {
              DocumentType: this._objectTypeLabels[link.PredObjectType] || link.PredObjectType,
              Document: link.PredDocument,
              SourceSystem: this._sourceSystLabels[link.PredSystem] || link.PredSystem,
              Status: "Standard"
            });
          }
          const succKey = `${link.SuccDocument}`;
          if (!documents.has(succKey) && (rootDocument === '' || succKey === rootDocument)) {
            documents.set(succKey, {
              DocumentType: this._objectTypeLabels[link.SuccObjectType] || link.SuccObjectType,
              Document: link.SuccDocument,
              SourceSystem: this._sourceSystLabels[link.SuccSystem] || link.SuccSystem,
              Status: "Standard"
            });
          }
        });

        return Array.from(documents.values());
      }

    });
  }
);
