sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/model/Sorter',
	'sap/m/MessageBox',
	'sap/f/library'
], function (JSONModel, Controller, Filter, FilterOperator, Sorter, MessageBox, fioriLibrary) {
	"use strict";

	// shortcut for sap.f.LayoutType
	var LayoutType = fioriLibrary.LayoutType;

	return Controller.extend("phoron.prototype.controller.Detail", {
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;

			this.oRouter.getRoute("detail").attachPatternMatched(this._onDocumentMatched, this);

			const oViewModel = new JSONModel({
				document: "",
				documentType: "",
				sourceSystem: "",
			});

			this.getView().setModel(oViewModel, "detailView");
		},

		onListItemPress: function (oEvent) {
			const oViewModel = this.getView().getModel("detailView");
			const mainDocument = oViewModel.getProperty("/document");
			let document;
			
			if (oEvent.getParameter && oEvent.getParameter("rowContext")) {
				const documentPath = oEvent.getParameter("rowContext").getPath();
				document = this.getView().getModel("localModel").getProperty(documentPath).Document;
			}	 else {
				const oContext = oEvent.getSource().getBindingContext("localModel");
				document = oContext.getProperty("Document");

			}
			this.oRouter.navTo("detailDetail", { layout: LayoutType.TwoColumnsMidExpanded, mainDocument: mainDocument, document: document });
		},

		onRowsUpdated: function (oEvent) {
			const oTable = oEvent.getSource();

			for (let i = 0; i < oTable.getRows().length; i++) {
				oTable.expand(i);
			}
		},

		_onDocumentMatched: function (oEvent) {
			const document = oEvent.getParameter("arguments").document;
			const aDocuments = this.getView().getModel("localModel").getProperty("/DocumentList");
			const oDocument = aDocuments.find((row) => row.Document === document);
			const oViewModel = this.getView().getModel("detailView");
			const oLocalModel = this.getView().getModel("localModel");
			const aDocFlow = oLocalModel.getProperty("/DocumentFlow");
			const rootDocument = this._findFirstDocumentInHierarchy(aDocFlow, oDocument.Document);

			oViewModel.setProperty("/document", oDocument.Document);
			oViewModel.setProperty("/documentType", oDocument.DocumentType);
			oViewModel.setProperty("/sourceSystem", oDocument.SourceSystem);

			oLocalModel.setProperty("/DocumentTree", this._buildHierarchy(aDocFlow, rootDocument, '', ''));
		},

		_findFirstDocumentInHierarchy: function (documentLinks, targetDocument) {
			let current = targetDocument;
			let visited = new Set();

			while (true) {
				const link = documentLinks.find(l => l.SuccDocument === current);
				if (!link || visited.has(current)) {
					return current;
				}
				visited.add(current);
				current = link.PredDocument;
			}
		},

		_buildHierarchy: function (documentLinks, rootDocument, rootDocumentType, rootSystem) {

			const objectTypeLabels = {
				PO: "Purchase Order",
				SO: "Sales Order",
				OD: "Outbound Delivery",
				BD: "Billing Document",
				MD: "Material Document",
				ID: "Inbound Delivery",
				SI: "Supplier Invoice"
			};
			const sourceSystLabels = {
				S1: "ECC",
				S2: "S/4 private",
				S3: "S/4 public"
			}

			function buildNode(system, objectType, document, documentItem) {
				const successors = documentLinks.filter(link =>
					link.PredDocument === document && link.PredSystem === system
				);
				const node = {
					System: system,
					ObjectType: objectTypeLabels[objectType] || objectType,
					Document: document,
					DocumentItem: documentItem,
					SourceSystem: sourceSystLabels[system] || system
				};
				if (successors.length > 0) {
					node.Documents = successors.map(link => {
						return buildNode(link.SuccSystem, link.SuccObjectType, link.SuccDocument, link.SuccDocumentItem);
					});
				}
				return node;
			}

			const rootLinks = documentLinks.filter(link =>
				(rootDocument === '' || link.PredDocument === rootDocument) &&
				(rootDocumentType === '' || link.PredObjectType === rootDocumentType) &&
				(rootSystem === '' || link.PredSystem === rootSystem)
			);

			if (rootLinks.length === 0) {
				const match = documentLinks.find(link =>
					(rootDocument === '' || link.SuccDocument === rootDocument) &&
					(rootDocumentType === '' || link.SuccObjectType === rootDocumentType) &&
					(rootSystem === '' || link.SuccSystem === rootSystem)
				);
				if (match) {
					return [
						buildNode(match.SuccSystem, match.SuccObjectType, match.SuccDocument, match.SuccDocumentItem)
					];
				}
				return [];
			}

			const roots = Array.from(
				new Set(
					rootLinks.map(
						link => `${link.PredSystem}|${link.PredObjectType}|${link.PredDocument}|${link.PredDocumentItem}`
					)
				)
			).map(key => {
				const [system, objectType, document, documentItem] = key.split('|');
				return buildNode(system, objectType, document, documentItem);
			});

			return roots;
		},
	});
});
