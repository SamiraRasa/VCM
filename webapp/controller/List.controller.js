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
      },

      onSearch: function (oEvent) {

        BusyIndicator.show(0);
        
        setTimeout(function () {
          const sDoc = this.byId("docIdInput").getValue();
          const sDocType = this.byId("docTypeSelect").getSelectedKey();
          const sSourceSyst = this.byId("sourceSystSelect").getSelectedKey();
  
          const oMockData = [
            { PredSystem: "S1", PredObjectType: "PO", PredDocument: "4500000158", PredDocumentItem: "10", SuccSystem: "S2", SuccObjectType: "SO", SuccDocument: "60000028", SuccDocumentItem: "10" },
            { PredSystem: "S1", PredObjectType: "PO", PredDocument: "4500000158", PredDocumentItem: "10", SuccSystem: "S2", SuccObjectType: "OD", SuccDocument: "80000146", SuccDocumentItem: "10" },
            { PredSystem: "S2", PredObjectType: "OD", PredDocument: "80000146", PredDocumentItem: "10", SuccSystem: "S2", SuccObjectType: "BD", SuccDocument: "90000123", SuccDocumentItem: "1" },
            { PredSystem: "S2", PredObjectType: "OD", PredDocument: "80000146", PredDocumentItem: "10", SuccSystem: "S2", SuccObjectType: "MD", SuccDocument: "4900000419", SuccDocumentItem: "1" },
            { PredSystem: "S2", PredObjectType: "OD", PredDocument: "80000146", PredDocumentItem: "10", SuccSystem: "S1", SuccObjectType: "ID", SuccDocument: "180000049", SuccDocumentItem: "10" },
            { PredSystem: "S2", PredObjectType: "BD", PredDocument: "90000123", PredDocumentItem: "1", SuccSystem: "S2", SuccObjectType: "SI", SuccDocument: "5105600178", SuccDocumentItem: "1" },
            { PredSystem: "S2", PredObjectType: "MD", PredDocument: "4900000419", PredDocumentItem: "1", SuccSystem: "S2", SuccObjectType: "MD", SuccDocument: "4900000420", SuccDocumentItem: "1" },
            { PredSystem: "S1", PredObjectType: "ID", PredDocument: "180000049", PredDocumentItem: "10", SuccSystem: "S1", SuccObjectType: "MD", SuccDocument: "5000000225", SuccDocumentItem: "1" },
            { PredSystem: "S2", PredObjectType: "MD", PredDocument: "4900000420", PredDocumentItem: "1", SuccSystem: "S1", SuccObjectType: "MD", SuccDocument: "4900000421", SuccDocumentItem: "1" }
          ];
  
          const oLocalModel = this.getView().getModel("localModel");
  
          oLocalModel.setProperty("/DocumentFlow", oMockData);
          oLocalModel.setProperty("/DocumentList", this._listAllDocuments(oMockData, sDoc, sDocType, sSourceSyst));
          oLocalModel.setProperty("/DocumentNodes", this._listAllDocuments(oMockData, "", "", ""));
          BusyIndicator.hide();
        }.bind(this), 500);


        // oModel.read("/DocumentFlow", {
        //   success: function (oData) {
        //     const oLocalModel = this.getView().getModel("localModel");
        //     const sDoc = this.byId("docIdInput").getValue();
        //     const sDocType = this.byId("docTypeSelect").getSelectedKey();
        //     const sSourceSyst = this.byId("sourceSystSelect").getSelectedKey();

        //     // oLocalModel.setProperty("/DocumentTree", this._buildHierarchy(oData.results, sDoc, sDocType, sSourceSyst));
        //     oLocalModel.setProperty("/DocumentFlow", oData.results);
        //     oLocalModel.setProperty("/DocumentList", this._listAllDocuments(oData.results, sDoc, sDocType, sSourceSyst));
        //     BusyIndicator.hide();
        //   }.bind(this)
        // });
      },

      onListItemPress: function (oEvent) {
        const documentPath = oEvent.getSource().getSelectedItem().getBindingContext("localModel").getPath();
        const oDocument = this.getView().getModel("localModel").getProperty(documentPath);
        const document = oDocument.Document;

        this.oRouter.navTo("detail", { layout: LayoutType.OneColumn, document: document });
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
              SourceSystem: this._sourceSystLabels[link.PredSystem] || link.PredSystem
            });
          }
          const succKey = `${link.SuccDocument}`;
          if (!documents.has(succKey) && (rootDocument === '' || succKey === rootDocument)) {
            documents.set(succKey, {
              DocumentType: this._objectTypeLabels[link.SuccObjectType] || link.SuccObjectType,
              Document: link.SuccDocument,
              SourceSystem: this._sourceSystLabels[link.SuccSystem] || link.SuccSystem
            });
          }
        });

        return Array.from(documents.values());
      }

    });
  }
);
