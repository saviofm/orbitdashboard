sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";
	
	return Controller.extend("Orbit.BaseController", {
	
		getRouter : function () {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},
		
		getRootPath: function(url){
			var sRootPath = jQuery.sap.getModulePath("com.delta");
			var sImagePath = sRootPath + url;
			return sImagePath;
		},
		
		doLog: function() {
			//console.log("Hello");
		}
		
		
	});
 
});
