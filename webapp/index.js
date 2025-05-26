sap.ui.define([
	"sap/ui/core/ComponentContainer"
], function (ComponentContainer) {
	"use strict";

	new ComponentContainer({
		name : 'phoron.prototype',
		height : "100%",
		settings : {
			id : "phoron.prototype"
		},
		manifest: true
	}).placeAt('content');
});
