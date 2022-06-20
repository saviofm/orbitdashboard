sap.ui.define([
	"sap/ui/core/ws/WebSocket",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	'sap/m/Dialog',
	'sap/m/Button',
	'sap/m/Title'
], function (WebSocket, JSONModel, Toast, Dialog, Button, Title) {
	"use strict";

		var counterfeitIDValue = "0419FE98077C"; //Default to blue ball
		var notificationSettingsModel =  {
			SMS: {
				Active: "",
				Content: ""
			},
			Ariba: {
				Active: "",
				Content: ""
			},
			C4C: {
				Active: "",
				Content: ""
			},
			S4HANA: {
				Active: "",
				Content: ""
			}
		};
		
	return {
		init: function (view, model, path) {
			var self = this;
			//this.setView(view);

			// Create the dialog
			//self._oDialogNoteSettings = sap.ui.xmlfragment("Orbit.lib.notificationSettingsDialog", this);
			// self.notificationsDialog = sap.ui.xmlfragment("Orbit.lib.notificationsDialog", this);
			//self.getView().addDependent(self.notificationsDialog);
			
			
			// jQuery.sap.require("jquery.sap.storage");
			// var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			
			// var notesSettingsModel;
			// if (oStorage.get("NotificationSettings")) {
			// 	// console.log("CUSTOM LOCAL")
			// 	notesSettingsModel = new JSONModel(oStorage.get("NotificationSettings"));
			// }
			// else{
			// 	notesSettingsModel = new JSONModel(this.rulesSettingsObj(path));
			// }

			// // notesSettingsModel.setDefaultBindingMode("TwoWay");
			// this.getView().setModel(notesSettingsModel, "NotificationSettings");
			// sap.ui.getCore().setModel(self.getView().getModel("NotificationSettings"), "NotificationSettings");

			// var notesModel = new JSONModel({
			// 	"Notifications": []
			// });
			// // notesModel.setDefaultBindingMode("TwoWay");
			// this.getView().setModel(notesModel, "Notifications");
			// sap.ui.getCore().setModel(self.getView().getModel("Notifications"), "Notifications");

			// if (model && path) {
			// 	self.setListener(model, path);
			// }

		},

		setListener: function (model, path) {
			var self = this;
			setInterval(function () {
				var value = model.getProperty(path);
				self.checkIfNotificationTriggered(value, self);
			}, 3000);
		},

		checkIfNotificationTriggered: function (value) {
			//Check if the value is equal to the flaggd ball ID
			if(value === counterfeitIDValue){
				var dialog = new Dialog({
					title: 'Error Detected!',
					type: 'Message',
					content: [
						new Title({text: "Error! Invalid ID \""+counterfeitIDValue+"\" Found!" })
					],
					endButton: new Button({
						text: 'Cancel',
						press: function () {
							dialog.close();
						}
					}),
					afterClose: function() {
						dialog.destroy();
					}
				});
				dialog.open();
			}
			
			
			
		},

		fireNotifications: function () {
			var self = this;
			var obj;
			var noteSettings = this.getView().getModel("NotificationSettings").getData();
			var notesModel = self.getView().getModel("Notifications").getData();
			var notifications = notesModel.Notifications;
			var msg;

			if (noteSettings["Services"]["SMS"]["Active"]) {
				obj = {
					type: "httpclient",
					dest: noteSettings["Services"]["SMS"]["PhoneNumber"],
					contents: JSON.stringify(noteSettings["Services"]["SMS"]["Text"]),
				};
				$.ajax({
					method: "GET",
					url: "https://iotuisolexphcp.us1.hana.ondemand.com/iotui/CallSMSNew?type=httpclient&dest=" + obj.dest + "&contents=" + obj.contents,
				})
				.done(function () {
					notifications.unshift({
						"Message": "SMS send to technician.",
						"Time": Date.now()
					});
				})
				.fail(function (jqXHR, textStatus) {
					// console.log("Request failed: " + textStatus);
				});
			}

			if (noteSettings["Services"]["Ariba"]["Active"]) {
				obj = {
					sensor: noteSettings.RulesSettings.Selected.SensorName
				};
				this.noteAjax("/aribaRequisition/RequisitionServlet", obj, "GET", "Ariba purchase requisition created.", "Ariba");
			}

			if (noteSettings["Services"]["C4C"]["Active"]) {
				obj = {
					customerName: noteSettings.RulesSettings.Selected.SensorName,
					message: noteSettings["Services"]["C4C"]["Message"],
					tenant: noteSettings["Services"]["C4C"]["Tenant"]
				};
				$.post("/c4cticket", obj, "json").done(function (data, textStatus, jqXHR) {
					msg = "C4C Ticket created.";
					notifications.unshift({
						"Message": msg,
						"Time": Date.now(),
						"Url": "https://"+ noteSettings["Services"]["C4C"]["Tenant"] +".crm.ondemand.com"
					});
				});
			}

			if (noteSettings["Services"]["S4HANA"]["Active"]) {
				this.createWorkOrder();
			}
			if (noteSettings["Services"]["ByDesign"]["Active"]) {
				this.createServiceRequest();
			}

			// if (noteSettings["Services"]["Marketing"]["Active"] ) {
			// 	self.streamToMarketingCloud();
			// 	if (noteSettings["Services"]["Marketing"]["Streaming"]) {
			// 		var intervalTime = 60000;
			// 		var now = Date.now();
			// 		clearInterval(noteSettings["Services"]["Marketing"]["Interval"]);
			// 		noteSettings["Services"]["Marketing"]["Interval"] = setInterval(function () {
			// 			if (noteSettings.Services.Marketing.Active && noteSettings.Services.Marketing.Streaming && now - noteSettings["Services"]["Marketing"]["Timer"] >= intervalTime) {
			// 				//TODOO
			// 				self.streamToMarketingCloud();
			// 			}
			// 		}, intervalTime);
			// 	}
			// }
			
			this.getView().getModel("NotificationSettings").updateBindings();
			this.getView().getModel("Notifications").updateBindings();
		},
		
		
		//Change the notification value 
		// notificationSelectionChange: function(evt){
		// 	var self = sap.ui.getCore();
		// 	var selectedNotification = evt.getParameter("selectedItem").getKey();
		// 	//console.log(selectedNotification);
		// 	notificationValueToCheck = selectedNotification;
			
		// 	if(selectedNotification === "capacity"){
		// 		self.byId("capacityConfigContainer").setVisible(true);
		// 		self.byId("counterfeitBallContainer").setVisible(false);
		// 	}
		// 	if(selectedNotification === "counterfeit"){
		// 		self.byId("capacityConfigContainer").setVisible(false);
		// 		self.byId("counterfeitBallContainer").setVisible(true);
		// 	}
		// 	Toast.show("Selected "+selectedNotification+" notifications.");
		// },
		
		
		//Get ID to check for from input field
		changeBallIDtoCheck: function(){
			counterfeitIDValue = sap.ui.getCore().byId("errorBallInput").getValue();
		},


		noteAjax: function (url, json, method, noteText, noteType) {
			var self = this;
			var notesModel = self.getView().getModel("Notifications").getData();
			var notifications = notesModel.Notifications;
			if (!method) {
				method = "GET";
			}

			$.ajax({
					method: method,
					url: url,
					data: json,
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					}
				})
				.done(function () {
					var noteObj = {
						"Message": noteText,
						"Time": Date.now()
					};

					if (noteType === "Ariba") {
						noteObj["Url"] = "http://salesdemo.procurement.ariba.com/";
					}
					notifications.unshift(noteObj);
					self.getView().getModel("Notifications").updateBindings();
				})
				.fail(function (jqXHR, textStatus) {
					console.log("Request failed: " + textStatus);
				});
		},

		createWorkOrder: function () {

			var notesModel = this.getView().getModel("Notifications").getData();
			var notifications = notesModel.Notifications;
			var self = this;

			$.ajax({
				url: "/workOrder",
				headers: {
					'x-csrf-token': 'Fetch',
					'Content-Type': 'application/atom+xml; type=entry; charset=utf-8',

					'Allow': 'GET'
				},
				xhrFields: {
					withCredentials: true
				},
				crossDomain: true,
				success: function (data, textStatus, xhr) {
					var csrfToken = xhr.getResponseHeader('x-csrf-token');
					// var cookies = xhr.getResponseHeader('Cookie');

					// console.log(cookies);
					var json = JSON.stringify({
						"Equipment": "P-3000-N007",
						"Ordertype": 'PM01',
						"Priority": '2',
						"Desc": "Work Order"
					});
					$.ajax({
						url: "/workOrder",
						// url: "/destinations/workOrder?Equipment=P-3000-N007&Ordertype=PM01&Priority=2&Desc=work",
						method: "POST",
						data: json,
						headers: {
							'x-csrf-token': csrfToken,
							'Content-Type': 'application/json',
							'Allow': 'POST',
							'Accept': 'application/json'
						},
						xhrFields: {
							withCredentials: true
						},
						crossDomain: true,
						success: function (data, textStatus, xhr) {
							var msg = "S4Hana: Work order " + data.d.Workorder + " created. ";

							notifications.unshift({
								"Message": msg,
								"Time": Date.now()
							});
							
							self.getView().getModel("Notifications").updateBindings();

						}
					});
				}
			});

		},

		createServiceRequest: function () {
			var self = this;
			var noteSettings = this.getView().getModel("NotificationSettings").getData();
			var notesModel = this.getView().getModel("Notifications").getData();
			var notifications = notesModel.Notifications;
			var operand = noteSettings["RulesSettings"]["Selected"]["Operand"];
			if (operand === ">") {
				operand = "greater than";
			} 
			if (operand === "<"){
				operand = "less than";
			}
			else{
				operand = "equal to";
			}

			var triggerRules = " (" + noteSettings["RulesSettings"]["Selected"]["Sensor"] + " " + operand + " " + noteSettings["RulesSettings"][
				"Selected"
			]["Value"] + ")";
			var message = noteSettings["RulesSettings"]["SensorName"] + " " + noteSettings["RulesSettings"]["Message"] + triggerRules;
			var xml =
				"<x:Envelope xmlns:x=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:glo=\"http://sap.com/xi/SAPGlobal20/Global\" xmlns:glo2=\"http://sap.com/xi/A1S/Global\" xmlns:gdt=\"http://sap.com/xi/AP/Common/GDT\" xmlns:glo5=\"http://sap.com/xi/AP/CRM/Global\" xmlns:glo4=\"http://sap.com/xi/DocumentServices/Global\">\n    <x:Header/>\n    <x:Body>\n        <glo:ServiceRequestBundleMaintainRequest_sync>\n            <BasicMessageHeader>\n\n            </BasicMessageHeader>\n            <ServiceRequest ActionCode=\"01\">\n              \n                <BuyerID >CP100110</BuyerID>\n                <Name languageCode=\"EN\">" +
				message + "</Name>\n                <RequestInitialReceiptTimePointTimePointTerms>\n                    <ReportedOnDateTime>" + date +
				"</ReportedOnDateTime>\n                </RequestInitialReceiptTimePointTimePointTerms>\n                <MainIncidentServiceIssueCategory>\n                    <ServiceIssueCategoryCatalogueIncidentCategoryKey></ServiceIssueCategoryCatalogueIncidentCategoryKey>\n                </MainIncidentServiceIssueCategory>\n                <BuyerParty>\n                    <PartyKey>\n                        <PartyID>CP100110</PartyID>\n                    </PartyKey>\n                   \n                </BuyerParty>\n                  <ServiceTerms>\n   <ServicePriorityCode>3</ServicePriorityCode>\n   <ServiceIssueCategoryCatalogueServiceCategoryKey>\n    <ServiceIssueCategoryCatalogueServiceCategoryKey>10014000</ServiceIssueCategoryCatalogueServiceCategoryKey>\n   </ServiceIssueCategoryCatalogueServiceCategoryKey>\n  </ServiceTerms>\n\n     \n                \n              \n            </ServiceRequest>\n        </glo:ServiceRequestBundleMaintainRequest_sync>\n    </x:Body>\n</x:Envelope>";
			var json = {
				"tenant": noteSettings.Services.ByDesign.Tenant.replace(/\s/g, ''),
				"payload": xml
			}

			$.ajax({
				url: "/byDesign",
				data: JSON.stringify(json),
				method: "POST",
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			}).done(function (response) {
				var msg = "Service Request created. ";
				notifications.unshift({
					"Message": msg,
					"Time": Date.now()
				});
				self.getView().getModel("Notifications").updateBindings();
			});
		},

	
		openNotificationsDialog: function () {
			if (!this.notificationsDialog.isOpen()){
				this.notificationsDialog.open();
				setTimeout(function(){this.closeNotificationsDialog();},6000); //Close after 6 seconds
			}
		},

		closeNotificationsDialog: function () {
			if (this.notificationsDialog) {
				this.notificationsDialog.close();
			}

		},


		rulesSettingsObj: function (path) {
			return {
				"RulesSettings": {
					"NotificationsActive": false,
					"Selected": {
						"Sensor": "movement",
						"Operand": ">",
						"Value": 15,
						"Path": path,
						"SensorName": "Sensor"
					},
					"Sensors": [{
						"Sensor": "movement"
					}, {
						"Sensor": "light"
					}, {
						"Sensor": "temperature"
					}, {
						"Sensor": "irtemperature"
					}],
					"Operands": [{
						"Operand": ">"
					}, {
						"Operand": "<"
					}, {
						"Operand": "="
					}],
					"Message": "is about to break down."
				},
				"Services": {
					"SMS": {
						"Active": false,
						"PhoneNumber": "",
						"Text": ""
					},
					"Ariba": {
						"Active": false
					},
					"C4C": {
						"Active": false,
						"Tenant": "",
						"Message": ""
					},
					"Marketing": {
						"Active": false,
						"Tenant": "https://gdm-marketing-cloud-emea.demo.hybris.com",
						"Streaming": false,
						"Email": "",
						"Timer": 0
					},
					"S4HANA": {
						"Active": false
					},
					"ByDesign": {
						"Active": false,
						"Tenant": "https://my341975.sapbydesign.com"
					}
				}
			};
		},

		openNotificationSettingsDialog: function () {
			console.log("Open Notifications Configuration");
			this._oDialogNoteSettings.open();
			sap.ui.getCore().byId("errorBallInput").setValue(counterfeitIDValue);
		},

		closeNoteSettingsDialog: function () {
			if (this._oDialogNoteSettings) {
				this._oDialogNoteSettings.close();
				
				jQuery.sap.require("jquery.sap.storage");
				var	oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
				oStorage.put("NotificationSettings", sap.ui.getCore().getModel("NotificationSettings").getData());
			}
		}

	};
});