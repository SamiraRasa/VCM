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

		onListItemPress: function (oEvent) {
			const oViewModel = this.getView().getModel("detailView");
			const mainDocument = oViewModel.getProperty("/document");
			let document;

			if (oEvent.getParameter && oEvent.getParameter("rowContext")) {
				const documentPath = oEvent.getParameter("rowContext").getPath();
				document = this.getView().getModel("localModel").getProperty(documentPath).Document;
			} else {
				const oContext = oEvent.getSource().getBindingContext("localModel");
				document = oContext.getProperty("Document");
			}

			const aDocuments = this.getView().getModel("localModel").getProperty("/DocumentNodes");

			aDocuments.forEach((row) => {
				if (row.Document === document) {
					row.Status = "Success";
				} else {
					row.Status = "Standard";
				}
			});

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
			const aHierarchy = this._buildHierarchy(aDocFlow, rootDocument, '', '');
			const aRootDocuments = this._collectDocuments(aHierarchy);
			const aLines = aDocFlow.filter(oDocFlow =>
				(aRootDocuments.includes(oDocFlow.PredDocument) || aRootDocuments.includes(oDocFlow.SuccDocument))
			);

			oViewModel.setProperty("/document", oDocument.Document);
			oViewModel.setProperty("/documentType", oDocument.DocumentType);
			oViewModel.setProperty("/sourceSystem", oDocument.SourceSystem);

			oLocalModel.setProperty("/DocumentTree", aHierarchy);
			oLocalModel.setProperty("/DocumentNodes", this._getDocuments(aDocFlow, aRootDocuments));
			oLocalModel.setProperty("/DocumentLines", aLines);
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

		_collectDocuments: function (nodes) {
			const result = [];

			function traverse(nodeList) {
				for (const node of nodeList) {
					if (node.Document) {
						result.push(node.Document);
					}

					if (Array.isArray(node.Documents)) {
						traverse(node.Documents);
					}
				}
			}

			traverse(nodes);
			return result;
		},

		_getDocuments: function (documentLinks, aRootDocuments) {
			const filteredLinks = documentLinks.filter(link =>
				(aRootDocuments.includes('') || aRootDocuments.includes(link.PredDocument) || aRootDocuments.includes(link.SuccDocument))
			);

			const documents = new Map();

			filteredLinks.forEach(link => {
				const predKey = `${link.PredDocument}`;
				if (!documents.has(predKey) && (aRootDocuments.includes('') || aRootDocuments.includes(predKey))) {
					documents.set(predKey, {
						DocumentType: this._objectTypeLabels[link.PredObjectType] || link.PredObjectType,
						Document: link.PredDocument,
						SourceSystem: this._sourceSystLabels[link.PredSystem] || link.PredSystem,
						Status: "Standard"
					});
				}
				const succKey = `${link.SuccDocument}`;
				if (!documents.has(succKey) && (aRootDocuments.includes('') || aRootDocuments.includes(succKey))) {
					documents.set(succKey, {
						DocumentType: this._objectTypeLabels[link.SuccObjectType] || link.SuccObjectType,
						Document: link.SuccDocument,
						SourceSystem: this._sourceSystLabels[link.SuccSystem] || link.SuccSystem,
						Status: "Standard"
					});
				}
			});

			return Array.from(documents.values());
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
