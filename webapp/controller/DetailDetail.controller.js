sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/f/library"
], function (JSONModel, Controller, fioriLibrary) {
	"use strict";

	// shortcut for sap.f.LayoutType
	var LayoutType = fioriLibrary.LayoutType;

	return Controller.extend("phoron.prototype.controller.DetailDetail", {
		onInit: function () {
			var oExitButton = this.getView().byId("exitFullScreenBtn"),
				oEnterButton = this.getView().byId("enterFullScreenBtn");

			this.oRouter = this.getOwnerComponent().getRouter();
			this.oModel = this.getOwnerComponent().getModel();

			this.oRouter.getRoute("detailDetail").attachPatternMatched(this._onDocumentMatched, this);

			[oExitButton, oEnterButton].forEach(function (oButton) {
				oButton.addEventDelegate({
					onAfterRendering: function () {
						if (this.bFocusFullScreenButton) {
							this.bFocusFullScreenButton = false;
							oButton.focus();
						}
					}.bind(this)
				});
			}, this);

			const oViewModel = new JSONModel({
				document: "",
				documentType: "",
				sourceSystem: "",
			});

			this.getView().setModel(oViewModel, "detailDetailView");
		},
		handleItemPress: function (oEvent) {
			var supplierPath = oEvent.getSource().getSelectedItem().getBindingContext("products").getPath(),
				supplier = supplierPath.split("/").slice(-1).pop();

			this.oRouter.navTo("detailDetailDetail", { layout: LayoutType.ThreeColumnsMidExpanded, category: this._category, product: this._product, supplier: supplier });
		},
		handleFullScreen: function () {
			this.bFocusFullScreenButton = true;
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.navigateToView(sNextLayout, "detailDetail");
		},
		handleExitFullScreen: function () {
			this.bFocusFullScreenButton = true;
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/exitFullScreen");
			this.navigateToView(sNextLayout, "detailDetail");
		},
		handleClose: function () {
			var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
			this.navigateToView(sNextLayout, "detail");
		},
		navigateToView: function (sNextLayout, sNextView) {
			this.oRouter.navTo(sNextView, { layout: sNextLayout, mainDocument: this._mainDocument, document: this._document });
		},
		_onDocumentMatched: function (oEvent) {
			const mainDocument = oEvent.getParameter("arguments").mainDocument;
			const document = oEvent.getParameter("arguments").document;
			const aDocuments = this.getView().getModel("localModel").getProperty("/DocumentList");
			const oDocument = aDocuments.find((row) => row.Document === document);
			const oViewModel = this.getView().getModel("detailDetailView");
			const oLocalModel = this.getView().getModel("localModel");
			const aDocFlow = oLocalModel.getProperty("/DocumentFlow");
			const rootDocument = this._findFirstDocumentInHierarchy(aDocFlow, document);

			this._mainDocument = mainDocument;
			this._document = document;

			oViewModel.setProperty("/document", oDocument.Document);
			oViewModel.setProperty("/documentType", oDocument.DocumentType);
			oViewModel.setProperty("/sourceSystem", oDocument.SourceSystem);

			oLocalModel.setProperty("/DocumentItems", this._getDocumentItems(aDocFlow, document));
			oLocalModel.setProperty("/ProcessFlow", this._buildHierarchyFlat(aDocFlow, rootDocument, "", ""));
		},

		_getDocumentItems: function (documentFlow, documentNumber) {
			const itemSet = new Set();

			documentFlow.forEach(entry => {
				if (entry.PredDocument === documentNumber) {
					itemSet.add(entry.PredDocumentItem);
				}
				if (entry.SuccDocument === documentNumber) {
					itemSet.add(entry.SuccDocumentItem);
				}
			});

			return Array.from(itemSet).map(item => ({
				Document: documentNumber,
				DocumentItem: item
			}));
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

		_buildHierarchyFlat: function (documentLinks, rootDocument, rootDocumentType, rootSystem) {
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
			};

			const result = new Map();

			function addNode(system, objectType, document, childDoc) {
				if (!result.has(document)) {
					result.set(document, {
						id: document,
						title: document,
						children: childDoc ? [childDoc] : [],
						texts: [objectTypeLabels[objectType] || objectType, `Source System: "${sourceSystLabels[system] || system}"`]
					});
				} else if (childDoc) {
					const node = result.get(document);
					if (!node.children.includes(childDoc)) {
						node.children.push(childDoc);
					}
				}
			}

			function traverse(document) {
				const links = documentLinks.filter(link => link.PredDocument === document);
				links.forEach(link => {
					addNode(link.PredSystem, link.PredObjectType, link.PredDocument, link.SuccDocument);
					addNode(link.SuccSystem, link.SuccObjectType, link.SuccDocument, null);
					traverse(link.SuccDocument);
				});
			}

			const initialLinks = documentLinks.filter(link =>
				(rootDocument === '' || link.PredDocument === rootDocument) &&
				(rootDocumentType === '' || link.PredObjectType === rootDocumentType) &&
				(rootSystem === '' || link.PredSystem === rootSystem)
			);

			const startingDocuments = new Set(initialLinks.map(link => link.PredDocument));

			startingDocuments.forEach(doc => traverse(doc));

			const output = Array.from(result.values()).map(node => {
				return {
					...node,
					children: node.children.length > 0 ? node.children : null
				};
			});

			return output;
		}
	});
});
