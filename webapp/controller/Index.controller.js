sap.ui.define([
	'jquery.sap.global',
	"sap/m/MessageToast",
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/Filter',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/ws/WebSocket',
	
	'sap/m/Dialog',
	'sap/m/Input',
	'sap/m/Button',
	'sap/ui/layout/HorizontalLayout',
	'sap/ui/layout/VerticalLayout',
	'sap/m/Text',
	'sap/m/Title'
], function (jQuery, MessageToast, Controller, Filter, JSONModel, WebSocket, Dialog, Input, Button, HorizontalLayout, VerticalLayout, Text, Title) {
	"use strict";

	
	//'Orbit/lib/NotificationRulesEngine',  NotificationSocket,
	 
	//Create objects
	var jsonData = {};
	var self;
	var getGaugeID1;
	var getGaugeID2;
	var readerNamesArray = ["reader1", "reader2", "other"];
	var errorBallIDValue;
	var splineChart;
	var savedConfiguration = {
		WIPinputValues: [105, 120],
		Activity_WIP: "WIP"
	};
	
	//Date Objects
	var beginDay = new Date();
	//beginDay.setDate(beginDay.getDate()-2);
	beginDay.setHours(0, 0, 0, 0);
	beginDay = beginDay.getTime();
	
	var thatGlobal;
	var dmeActiveItems;
	var wipMessageSent = false;
			
	//Begin conroller functions
	var ViewController = Controller.extend("Orbit.controller.Index", {

		onAfterRendering: function () {
			//STYLE CONTENT
			this.getView().byId("contentWindow").addStyleClass("contentStyle");
			this.getView().byId("ballCountContainer").addStyleClass("ballCountContainerStyle");
			this.getView().byId("totalScannedContainer").addStyleClass("whiteBackground"); 	//Make whiteBackground class items white
			this.getView().byId("productionRateContainer").addStyleClass("whiteBackground");
			this.getView().byId("capacityContainer").addStyleClass("whiteBackground");
			this.getView().byId("failureRateContainer").addStyleClass("whiteBackground");
			this.getView().byId("feedContainer").addStyleClass("whiteBackground"); 
			this.getView().byId("messageCenterContainer").addStyleClass("whiteBackground"); 
			this.getView().byId("sideMenuID").addStyleClass("sideMenuStyle"); 
			this.setScale();
			//END STYLE CONTENT
			
			var that = this;
			that.dmeOrderNumber = "";
			
			//DME Switch
			jQuery.sap.require("jquery.sap.storage");
			
			//Gauge Charts
			getGaugeID1 = this.getView().byId("gauge1ID").getId();
			that.gauges1 = new Gauge(getGaugeID1);
			getGaugeID2 = this.getView().byId("gauge2ID").getId();
			that.gauges2 = new Gauge(getGaugeID2);
			
			setInterval(function(){that.calculateCapacity();}, 1000); // Calculate capacity
			setInterval(function(){that.trackProductionProgress();}, 1000); //Track Production Progress
			setInterval(function(){that.createNewDataModel();}, 10* 1000); // Create new data model every 10 seconds

			this.setFailureChartData(); //Set failure chart
			this.initialTileViewSaved();//Determine visibility of WIP/Activty
			
		},
		

		//Populate list with JSON contents
		onInit: function (evt) {
			thatGlobal = this;
			//var oModel = new JSONModel(jQuery.sap.getModulePath("sap.ui.demo.mock", "/products.json"));
			this.getView().setModel(new JSONModel(jsonData), "ballFeed");
			sap.ui.getCore().setModel(this.getView().getModel("ballFeed"), "ballFeed");
			this.getView().setModel(new JSONModel({}), "ballHistory");
			sap.ui.getCore().setModel(this.getView().getModel("ballHistory"), "ballHistory");
			
			this.activateUsageTracking(); //ACTIVATE USAGE TRACKER
			
			var notificationsJSON = {
				Notifications: [{message:"Orbit Dashboard is Running."}],
				StatusColor : [{color: "#008FD3"}],
				ReaderStatus: [false, false]
			}; 
			//Define the model
			this.getView().setModel(new JSONModel(notificationsJSON), "notificationsModel"); //Set it
			sap.ui.getCore().setModel(this.getView().getModel("notificationsModel"), "notificationsModel");
			
			this.getView().setModel(new JSONModel(), "notifyMessageModel"); 
			sap.ui.getCore().setModel(this.getView().getModel("notifyMessageModel"), "notifyMessageModel");
			
			this.getView().setModel(new JSONModel(), "IntegrationSettings"); 
			sap.ui.getCore().setModel(this.getView().getModel("IntegrationSettings"), "IntegrationSettings");
			
			var buildJSON = {
				Layouts : [],
				All: {}
			};
			this.getView().setModel(new JSONModel(buildJSON), "ballModelsModel"); //Model for models selecton
			sap.ui.getCore().setModel(this.getView().getModel("ballModelsModel"), "ballModelsModel");
			self = this;
			
			//var tppmArray = {Balls: []};
			this.getView().setModel(new JSONModel([]), "trackProductionProgressModel"); //Model for models selecton
			sap.ui.getCore().setModel(this.getView().getModel("trackProductionProgressModel"), "trackProductionProgressModel");
			
			this.instantiateSplineGraph();
			this.buildID = this.checkForFieldInUri("groupID"); //Get subcription for feed

			this.initialDataPull();
			this.connectOrbitSocket();
			this.getView().setModel(new JSONModel({}),"totalBallsGraphJSON");
			//this.notificationSocket = NotificationSocket;
			//this.notificationSocket.init(this.getView(), this.getView().getModel("notifyMessageModel"), "/capacity/0"); //For notification socket
		},
		
		
		setScale: function(){
			jQuery.sap.initMobile({viewport:false});
			
			//Check if the device is a tablet
			const userAgent = navigator.userAgent.toLowerCase();
			const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
			console.log("Is tablet? "+isTablet);
			if(isTablet === true){
				this.getView().byId("scalableContainer").addStyleClass("containerScale"); 
				this.getView().byId("logoContainer").addStyleClass("logoScale");
			}
		},
		
		
		activateUsageTracking: function(){
			var DEMO_ID = "16014";
			var DEMO_AREA = "Innovation";
			var DEMO_COMMENT = "Live Digital Manufacturing";
			console.log("Usage Tracking Started");
			
			// Check if the DEMO_ID is not empty and if the app are not running in the test mode of the WebIDE
			if (DEMO_ID && location.hostname.indexOf("webidetesting") === -1) {
			  if (typeof trackDemo !== "function") {
			     jQuery.sap.includeScript( /* eslint-disable sap-no-hardcoded-url */
			        "https://apim-sdccsademo.apimanagement.hana.ondemand.com/sdc_demotracking/DemoTracking.js",
			        /* eslint-enable sap-no-hardcoded-url */
			        "DemoTracking"+DEMO_ID,
			        function() {
			           /* eslint-disable no-undef */
			           trackDemo(DEMO_ID, DEMO_AREA, DEMO_COMMENT);
			           /* eslint-enable no-undef */
			        },
			        function(err) { // For error debugging
			           JSON.stringify(err);
			        }
			     );
			  } else {
			     /* eslint-disable no-undef */
			     trackDemo(DEMO_ID, DEMO_AREA, DEMO_COMMENT);
			     /* eslint-enable no-undef */
			  }
			} else if (location.hostname.indexOf("webidetesting") !== -1) {
			  jQuery.sap.log.info("Discovered testing mode of the WebIDE. Tracking is deactivated.");
			} else {
			  jQuery.sap.log.error("The tracking DEMO_ID parameter is missing!");
			}
		},
		
		
		//-----------------------------------------------------------
		//---------------Raw Data Arrival/Processing
		//-----------------------------------------------------------
		
		checkForFieldInUri: function(fieldToCheck) {
		    var complete_url = window.location.href;
		    
		    if (complete_url.indexOf(fieldToCheck) === -1){
		        //return "554d3f3f"; //LOCAL PI
		        return "8a63ad27"; //D-Shop PI
		        // return "fdfa72d"; //NSQ Pi
		    }
		    var pieces = complete_url.split("?");
		    var params = pieces[1].split("&");
		    var result;
		
		    $.each( params, function( key, value ) {
		        var param_value = value.split("=");
		        if (param_value[0] === fieldToCheck){
		            result = param_value[1];
		        }
		    });
		    return result;
		},
		
		//Create websocket
		connectOrbitSocket: function () {
			//var buildID = savedConfiguration.Layout;
			var subString = "in/orbit/"+this.buildID+"/#";
			self.webSocket = null;
			self.webSocket = new WebSocket("wss://mgwws.hana.ondemand.com/endpoints/v1/ws");
			self.webSocket.attachOpen(function () {
				console.log('{"subscribe": ' + subString + '}');
				self.webSocket.send('{"subscribe": "' + subString + '", "_MessageGateway_SendWebSocketKeepAlive": true}');
				console.log("Connected");
			});

			// Triggered when message received to web socket
			self.webSocket.attachMessage(function (evt) {
				var msg = JSON.parse(evt.getParameters().data);
				thatGlobal.getJSONData(msg);
				// console.log("Message Received!");
				//console.log(msg);
				//thatGlobal.sendBallIDtoNotification(msg);//Send to notification function
				thatGlobal.createNewDataModel(); //Function for data calculations
				thatGlobal.trackProductionProgress(msg); //Track status of ball production
			});
			self.webSocket.attachError(function (evt) {
				console.log(evt);
			});
			self.webSocket.attachClose(function (evt) {
				console.log("Connection closed.");
			});
		},
		

		//Get historical data
		initialDataPull: function () {
			var that = this;
			//var buildID = savedConfiguration.Layout;
			jQuery.ajax({
				"async": true,
				"crossDomain": true,
				"url": "/MGWMS_Orbit/OrbitHistory?$filter=substringof(%27in/orbit/"+that.buildID+"/%27,TOPIC)%20and%20_MESSAGEGATEWAY_TIMEMILLISECONDS%20gt%20%27" +
					beginDay + "M%27%20&$format=json",
				"method": "GET",
				"headers": {
					"cache-control": "no-cache"
				},
				"processData": false,
				"contentType": false,
				"success": function (response) {
					console.log("Historical Data: ");
					console.log(response.d.results);
					sap.ui.getCore().getModel("ballHistory").setData(response.d);
					that.reformatOldJSONData(); //Reformat histoical data
					that.createNewDataModel();
				},
				"error": function () {
					console.log("Error with Ajax call");
				}
			});
		},
		
		
		//Format old data in 
		reformatOldJSONData: function () {
			var totalBallsToday = this.getView().getModel("ballHistory").getData();
			if (totalBallsToday.results) {
				this.getView().byId("totalUnitsProducedText").setText(totalBallsToday.results.length);

				if (totalBallsToday.results === null) {
					return; //If null skip
				}
				var unshiftBalls=[];
				for(var i=0;i<totalBallsToday.results.length;i++){
					unshiftBalls.unshift(totalBallsToday.results[i]);
				}
				totalBallsToday.results = unshiftBalls;
				
				this.getView().getModel("ballFeed").setData(totalBallsToday);
				var x = this.getView().getModel("ballFeed").getData();
				console.log("Historical Data Processing: ");
				console.log(x);
			}
		},
		
		
		
		//=========== DELETE ==============
		testFireNotification: function(){
			var event = {
					assetId: "041A150C5453",
					C_MGWMS_ID: "289722",
					GenID: "472814926048766601",
					layoutName: "8a63ad27",
					locationId: "reader1",
					topic: "in/orbit/8a63ad27/Start/Finish",
					_MessageGateway_TimeISO8601: "2019-06-25T15:04:39.174Z",
					_MessageGateway_TimeMilliseconds: "1561475079174"
				};
			this.getJSONData(event);
		},
		//=========== DELETE ==============



		//Format new ball message
		getJSONData: function (evt) {
			var data = this.getView().getModel("ballFeed").getData();
			if(evt !== undefined){
				if(evt.assetId){
					//console.log("Message Received!");
					//console.log(evt);
						
						//Default if null or undefined
						if(evt.assetId === undefined || evt.assetId === null ){
							evt.assetId = "DefaultID";
						} 
						if(evt.layoutName === undefined || evt.layoutName === null ){
							evt.layoutName = "8a63ad27";
						} 
						if(evt.locationId === undefined || evt.locationId === null ){
							evt.locationId = "DefaultLocation";
						} 
						if(evt.topic === undefined || evt.topic === null ){
							evt.topic = "DefaultTopic";
						} 
						if(evt._MessageGateway_TimeISO8601 === undefined || evt._MessageGateway_TimeISO8601 === null ){
							evt._MessageGateway_TimeISO8601 = "2019-06-25T15:04:39.174Z";
						} 
						if(evt._MessageGateway_TimeMilliseconds === undefined || evt._MessageGateway_TimeMilliseconds === null ){
							evt._MessageGateway_TimeMilliseconds = "1561475079174";
						} 
						
					
					
					var newData = {
						ASSETID: evt.assetId,
						LAYOUTNAME: evt.layoutName,
						LOCATIONID: evt.locationId,
						TOPIC: evt.topic,
						_MESSAGEGATEWAY_TIMEISO8601: evt._MessageGateway_TimeISO8601,
						_MESSAGEGATEWAY_TIMEMILLISECONDS: evt._MessageGateway_TimeMilliseconds
					};
					
					// console.log(data);
					
					data.results.unshift(newData);
					this.getView().getModel("ballFeed").setData(data);
					this.parseDMEData(newData);
				} else {
					//console.log("Keep Channel Alive!");
				}
			}
		},
		//-----------------------------------------------------------
		//---------------End Raw Data Arrival/Processing
		//-----------------------------------------------------------
		
		
		
		
		
		
		//-----------------------------------------------------------
		//---------------Process Data for Functions
		//-----------------------------------------------------------
		
		//Create New JSON Object
		createNewDataModel: function(){
			var ballfeed = this.getView().getModel("ballFeed").getData(); //Get Model
			
			if(ballfeed.results){
				var totalUnits = ballfeed.results.length; //Total count of scans
				var totalUnitsPerHour = this.todaysTotalUnitsPerHour(ballfeed); //Total count of scans per hour
				var averageTotalPerHour = this.averageUnitsPerHour(totalUnitsPerHour); //Get average balls 
				var averageTotal = averageTotalPerHour[averageTotalPerHour.length-1].scans; //Average total units
				var totalPerMinute = this.calculateCapacity(); //Calculate capacity
				
				// var finalDataModel = {
				// 	Total: totalUnits, 
				// 	TotalPerHour: totalUnitsPerHour,
				// 	AverageTotal: averageTotal,
				// 	AverageTotalPerHour: averageTotalPerHour,
				// 	TotalPerMinute: totalPerMinute
				// };
				
				// console.log("--------");
				// console.log(averageTotalPerHour);
				this.getView().byId("totalUnitsProducedText").setText(totalUnits); //Set total units text
				this.getView().byId("averageScansPerHourText").setText(averageTotal); //Set total units text
				this.populateSplineGraph(averageTotalPerHour);
			}
		},
	
		
		//Get all the total units today by hour
		todaysTotalUnitsPerHour: function (ballfeed) {
			var count = 0;
			var time = 6;
			var totalPerHourArray = [];
			var timeBegin = new Date();
			timeBegin.setHours(6,0,0,0);
			var timeEnd = new Date();
			timeEnd.setHours(7,0,0,0);
			
			for(var i=ballfeed.results.length-1; i>0 ;i--){
				var scannedTime = Date.parse(ballfeed.results[i]._MESSAGEGATEWAY_TIMEISO8601);
				if(scannedTime >= timeBegin && scannedTime <=timeEnd){ //if BallTime>=timeBegin && BallTime<=timeEnd
					count++;
				}
				else{
					totalPerHourArray.push({
						count: count,
						time: time
					});
					time+=1;
					timeBegin.setHours(time,0,0,0);
					timeEnd.setHours(time+1,0,0,0);
					count = 0;
				}
			}
			totalPerHourArray.push({
				count: count,
				time: time
			});
			
			//Remove items added unnecessarily 
			var currentTime = new Date(new Date().getTime()).getHours();
			var isCorrectTime = false;
			var j = totalPerHourArray.length-1;
			while(isCorrectTime === false){
				if( totalPerHourArray[j].time > currentTime){
					totalPerHourArray.pop();
					j--;
				}
				else{
					isCorrectTime = true;
				}
			}
			
			var totalDisplayed = [];
			totalDisplayed= totalPerHourArray.slice(totalPerHourArray.length - 5, totalPerHourArray.length);
			// console.log("Total to be displayed: ");
			// console.log(totalDisplayed);
			this.getView().getModel("totalBallsGraphJSON").setData(totalDisplayed); // Bind to chart
			//sap.ui.getCore().byId("totalBallsGraphJSON").getModel().refresh(true);
			//this.getView().byId("totalBarChartID").refresh(true);
			return totalPerHourArray;
		},	
		
		
		//Get the average units per hour
		averageUnitsPerHour: function(totalUnitsPerHour){
			var averageUnits = [{
				"scans": 0,   //Named as such because of the spline graph js file
				year: 6
			}];
			var summation = 0;
			for(var i=1; i<totalUnitsPerHour.length;i++){
				summation += totalUnitsPerHour[i].count;
				averageUnits.push({
					"scans": parseFloat((summation/i).toFixed(1)),
					year: totalUnitsPerHour[i].time
				});
			}
			// console.log("Average balls per hour: ");
			// console.log(averageUnits);
			return averageUnits;
		},
		
		
		//Calculate capacity
		calculateCapacity: function() {
			var ballfeed = this.getView().getModel("ballFeed").getData(); //Get Model
			// console.log("CAPACITY");
			// console.log(ballfeed);
			var pastMinute = [0,0,0];
			var completed = true;
			var oneMinuteAgo = new Date(new Date().getTime() - (1 * 3 * 1000)); //X seconds ago
			var capacity=[0,0,0];
			
			if(ballfeed.results.length > 0){
				var ballfeedIndex = 0; //ballfeed.results.length-1
				while(completed === true){
					var scannedTime = Date.parse(ballfeed.results[ballfeedIndex]._MESSAGEGATEWAY_TIMEISO8601); //Sometimes is camelCase
					if(scannedTime >= oneMinuteAgo){
						if(ballfeed.results[ballfeedIndex].LOCATIONID === readerNamesArray[0]){  //Reader1 ID
							pastMinute[0] +=1;
						}
						else if(ballfeed.results[ballfeedIndex].LOCATIONID === readerNamesArray[1]){  //Reader2 ID
							pastMinute[1] +=1;
						}
						else{
							pastMinute[2] +=1;
						}
					} else {
						completed = false;
					}
					ballfeedIndex ++;
				}
				capacity[0] = parseFloat((pastMinute[0]/15).toFixed(4)); //Capacity of reader 1
				capacity[1] = parseFloat(((pastMinute[1]/20)).toFixed(4)); //Capacity of reader 2
				capacity[2] = parseFloat((pastMinute[2]/30).toFixed(4)); //Capacity of unkown reader(s)
				
				if(capacity[1] > 0.29){capacity[1] += 0.20;}
				// console.log("Capacity Array: ");
				//console.log(capacity);
				this.getView().getModel("notifyMessageModel").setData({capacity: capacity}); //Set to model
				
				this.gauges1.capacity(capacity[0]);
				this.gauges2.capacity(capacity[1]);
			} else {
				//console.log("No BallFeed.");
			}
			this.checkNotification(capacity); //Notification function
			return capacity;
		},
		
		//Spline Graphs
		populateSplineGraph: function(averageTotalPerHour){
			var getSplineID = this.getView().byId("splineID").getId(); 
			splineChart.generateSplineGraph(averageTotalPerHour, getSplineID);
		},
		
		
		instantiateSplineGraph: function(){
			var getSplineID = this.getView().byId("splineID").getId(); 
			jQuery.sap.includeScript({
				url: "https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js" //Import D3 libraray
			}).then(function () {
				// try{ 
					splineChart = new SplineGraph(getSplineID);
				// }
				// catch(error){}
			});	
		},
		
		
		convertFromISOtoDate: function(iso){
			var getTime = []; 
			var r = new Date(iso);
			getTime[0] = r.getHours();
			getTime[1] = r.getMinutes();
			getTime[2] = r.getSeconds();
			//console.log(getTime);
			for(var i=0; i<getTime.length ;i++ ){
				if(getTime[i] <10){
					getTime[i] = "0"+getTime[i];
				}
			}
			var newTime = getTime[0]+":"+getTime[1]+":"+getTime[2];
			return newTime;
		},
		//-----------------------------------------------------------
		//---------------End Process Data for Functions
		//-----------------------------------------------------------
		



		//-----------------------------------------------------------
		//---------------Graphs and Charts
		//-----------------------------------------------------------
		//Failure Rate Bar Chart
		setFailureChart: function (obj, model) {
			obj.setVizProperties({
				plotArea: {
					dataLabel: { visible: true},
					background: { visible: false}
				},
				valueAxis: {
					title: { visible: false },
					scale: { fixedRange: true, minValue: 0, maxValue: 100}
				},
				categoryAxis: {
					title: { visible: false }
				},
				legend: {
					title: { visible: false },
					visible: false
				},
				legendGroup: {
					layout: { position: "bottom" }
				},
				title: { 
					visible: false,
					text: 'Test'
				}
			});
			var basicSetting = {
				plotArea: {
					colorPalette: ["#F0AB00", "#008FD3", "white", "white"]
				}
			};
			obj.setVizProperties(basicSetting);
			obj.setModel(model);
		},


		setFailureChartData: function () {
			var testPeople = {
				"items": [{
					"name": "Day 1",
					"time": 30,
					"id": 90
				}, {
					"name": "Day 2",
					"time": 40,
					"id": 20
				}, {
					"name": "Day 3",
					"time": 60,
					"id": 70
				}, {
					"name": "Day 5",
					"time": 35,
					"id": 10
				}]
			};
			var oVizFrame = this.getView().byId("idFailureBarFrame");
			var dataModel = new JSONModel(testPeople);
			this.setFailureChart(oVizFrame, dataModel);
		},
	
		//-----------------------------------------------------------
		//---------------End Graphs and Charts
		//-----------------------------------------------------------
		
		
		//-----------------------------------------------------------
		//---------------Local Notifications
		//-----------------------------------------------------------
		//MESSAGE CENTER
		checkNotification: function(capacity){
			var notificationModel = this.getView().getModel("notificationsModel").getData();
			var notifications = notificationModel.Notifications;
			var status = notificationModel.ReaderStatus;
			// var colors = notificationModel.Status;
			var phase1Error = "Assembly is Complete.";
			var phase2Error = "Inspection is Complete.";
			var phase1Back  = "Assembly is Processing.";
			var phase2Back  = "Inspection is Processing.";

			if(capacity[0] <0.05 && status[0]===true){
				notifications.unshift({message: phase1Error});
				status[0] = false;
			}
			else if(capacity[1] <0.05 && status[1]===true){
				notifications.unshift({message: phase2Error});
				status[1] = false;
			}
			else if(capacity[0] > 0.05 && status[0]===false){
				notifications.unshift({message: phase1Back});
				status[0] = true;
			}
			else if(capacity[1] > 0.05 && status[1]===false ){
				notifications.unshift({message: phase2Back});
				status[1] = true;
			}
			
			notificationModel.Notifications = notifications;
			notificationModel.ReaderStatus = status;
			//notificationModel.Status = colors;
			this.getView().getModel("notificationsModel").setData(notificationModel);
			this.getView().byId("messageCenterList").getItems()[0].addStyleClass("messageListStyle"); //Highlight first item in list
		},
		
		// sendBallIDtoNotification: function(ball){
		// 	var ballID = ball.assetId;
		// 	//console.log("BALL ID: "+ballID);
		// 	// this.notificationSocket = NotificationSocket;
		// 	// this.notificationSocket.checkIfNotificationTriggered(ballID);
		// },
		
		//-----------------------------------------------------------
		//---------------End Local Notifications
		//-----------------------------------------------------------		
		
		
		
		
		//-----------------------------------------------------------
		//---------------Side Menu
		//-----------------------------------------------------------
		//Open the side menu
		openSideMenu: function(){
			var sideMenu = this.getView().byId("sideMenuID");
			if(sideMenu.getVisible() === false){
				sideMenu.setVisible(true);
				this.getBuildIDs(); //Get models for dropdown
			}
			else{
				sideMenu.setVisible(false);
			}
		},
		
		
		//Change the selected layout
		// layoutSelectionChanged: function(evt){
		// 	var selectedLayout = evt.getParameter("selectedItem").getKey();
		// 	savedConfiguration.Layout = selectedLayout;
		// 	console.log("Layout Selected: "+selectedLayout);
		// 	this.openSideMenu(); //Close popup
		// },
		
		
		//Populate models dropdown
		getBuildIDs: function(){
			var that = this;
			jQuery.ajax({
				"async": true,
				"crossDomain": true,
				"url": "/MGWMS_Orbit/OrbitHistory?$filter=substringof(%27in/orbit/%27,TOPIC)%20and%20_MESSAGEGATEWAY_TIMEMILLISECONDS%20gt%20%27" +
					beginDay + "M%27%20&$format=json",
				"method": "GET",
				"headers": {
					"cache-control": "no-cache"
				},
				"processData": false,
				"contentType": false,
				"success": function (response) {
					var responseData = sap.ui.getCore().getModel("ballModelsModel").getData();
					responseData.All = response.d;
					sap.ui.getCore().getModel("ballModelsModel").setData(responseData);
					// console.log("Response Data ");
					// console.log(responseData);
					that.layoutSelectionCollection();
				},
				"error": function () {
					console.log("Error With Ajax Call.");
				}
			});
		},
		
		
		layoutSelectionCollection: function(){
			var modelsModel= this.getView().getModel("ballModelsModel").getData();
			var modelsList = [];
			var modelsCheck = [];
			if (modelsModel) {
				for(var i=0; i<modelsModel.All.results.length ;i++){
					var item = modelsModel.All.results[i].LAYOUTNAME;
					if(modelsCheck.length === 0 || modelsCheck === undefined){
						modelsList.unshift({items: item});
						modelsCheck.unshift(item);
					}
					else if (!modelsCheck.includes(item)){
						modelsList.unshift({items: item});
						modelsCheck.unshift(item);
					}
				}
				// console.log("Models List: ");
				// console.log(modelsList);
				modelsModel.Layouts = modelsList;
				this.getView().getModel("ballModelsModel").setData(modelsModel);
			}
		},
		
		
		//-----------------------------------------------------------
		//---------------Heatmap View
		//-----------------------------------------------------------
		openHeatmap: function(){
			var oView = this.getView();
			var oDialog = oView.byId("HeatmapViewID");
			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(oView.getId(), "Orbit.view.HeatmapView", this);
				oView.addDependent(oDialog);
			}
			this.openSideMenu(); //Close popup
			oDialog.open();
		}, 
		
		closeHeatmap: function(){
			this.getView().byId("HeatmapViewID").destroy();
		},
		
		
		

		
		//-----------------------------------------------------------
		//---------------Production Tracking / WIP
		//-----------------------------------------------------------	
		
		wipInputFields: function(){
			var val1 = this.getView().byId("wipinput1").getValue();
			var val2 = this.getView().byId("wipinput2").getValue();
			if(0<val1 && val1<val2){
				savedConfiguration.WIPinputValues[0] = val1;
				savedConfiguration.WIPinputValues[1] = val2;
				//console.log("WIP Range: "+ savedConfiguration.WIPinputValues[0]+", "+savedConfiguration.WIPinputValues[1]);
			}
		},
		
		trackProductionProgress: function(msg){
			var trackProductionProgressModel = this.getView().getModel("trackProductionProgressModel").getData();
			// trackProductionProgressModel = trackProductionProgressModel.Balls;
			// console.log(trackProductionProgressModel);
			var timeBlocks = [	new Date().getTime()-(savedConfiguration.WIPinputValues[0] * 1000), 
								new Date().getTime()-(savedConfiguration.WIPinputValues[1] * 1000)]; //X seconds ago

			//Add and remove balls from list
			var idFound = false;
			if(msg && msg.assetId){
				//errorBallIDValue = NotificationSocket.returnCounterfeitValue(); // Get counterfeit value
				
				var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
				var integrationSettings = oStorage.get("IntegrationSettings");
				if(integrationSettings.counterfeitIDValue !== undefined){
					errorBallIDValue = integrationSettings.counterfeitIDValue;
				}
				
				if(msg.assetId === errorBallIDValue){
					this.checkCounterfeitBall(msg.assetId);
				}
				
				if(trackProductionProgressModel.length >= 0 && msg.assetId !== errorBallIDValue){
					for(var i=0;i<trackProductionProgressModel.length;i++){
						if(trackProductionProgressModel[i].assetId === msg.assetId){
							idFound = true;
							break;
						}
					}
					if(idFound === false){
						trackProductionProgressModel.push(msg);
						//console.log("Added message!");
					}else{
						trackProductionProgressModel.splice(i,1);
						//console.log("Removed message!");
					}
				}
				
				this.getView().byId("wipLabel").setText("WORK IN PROCESS ("+trackProductionProgressModel.length +")");
			}
			
			//Check if balls are over time
			if(trackProductionProgressModel.length >0)
			{
				var count = 0;
				for(var j=0; j<trackProductionProgressModel.length ;j++){
					//Check if the ball has been in too long
					var ballTime = trackProductionProgressModel[j]._MessageGateway_TimeMilliseconds;
					if( ballTime > timeBlocks[0]){
						// console.log("Balls in the clear!");
						//Do nothing cause initial highlight is clear
					}
					if( ballTime < timeBlocks[0] && ballTime > timeBlocks[1]){
						// console.log("Balls in the yellow!");
						this.getView().byId("productionTrackingTableID").getItems()[j].addStyleClass("productionTrackingYellow"); //Highlight i item in list yellow
					}
					if( ballTime < timeBlocks[1]){
						// console.log("Balls in the red!");
						this.getView().byId("productionTrackingTableID").getItems()[j].addStyleClass("productionTrackingRed"); //Highlight i item in list red
						count++;
					}
				}
				this.wipWarningFlash(count);
			}
			this.getView().getModel("trackProductionProgressModel").setData(trackProductionProgressModel);
		},
		
		
		//Flash WIP container red if too many red alerts
		wipWarningFlash: function(count){
			var wipContainer = this.getView().byId("wipFailingMessageID");
			if(count >= 5){
				wipContainer.setText(count+" Failing!");
				if(wipContainer.hasStyleClass("wipFailingMessageColor") === false){
					wipContainer.addStyleClass("wipFailingMessageColor");
				}
			}
			else if(count < 5 && wipContainer.hasStyleClass("wipFailingMessageColor") === true){
				wipContainer.removeStyleClass("wipFailingMessageColor");
				wipMessageSent = false;
			}
			
			//Trigger notification if count is too high
			var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			var integrationSettings = oStorage.get("IntegrationSettings");
			if(integrationSettings.numberFailingToTriggerNotification && wipMessageSent === false){
				if(count >= integrationSettings.numberFailingToTriggerNotification && count !==0 ){
					wipMessageSent = true;
					this.sendIntegrationMessages();
				}
			}
		},
		
		
		resetWIP: function(){
			this.getView().getModel("trackProductionProgressModel").setData([]);
			this.getView().byId("wipLabel").setText("WORK IN PROCESS");
			
			var notificationsJSON = {
				Notifications: [{message:"Orbit Dashboard is Running."}],
				StatusColor : [{color: "#008FD3"}],
				ReaderStatus: [false, false]
			}; 
			this.getView().getModel("notificationsModel").setData(notificationsJSON); //Reset Message Center as well
			this.wipWarningFlash(0);
		},
		
		
		//Switch view of activity feed/ production tracking window
		switchActivityOrTracking: function(){
			var actWindow = this.getView().byId("activityFeedContainer");
			var prodWindow = this.getView().byId("productionTrackingContainer");
			
			if(prodWindow.getVisible() === false){
				prodWindow.setVisible(true);
				actWindow.setVisible(false);
				savedConfiguration.Activity_WIP = "WIP";
			}
			else{
				prodWindow.setVisible(false);
				actWindow.setVisible(true);
				savedConfiguration.Activity_WIP = "Activity";
			}
			this.openSideMenu(); //Close popup
		},
		
		initialTileViewSaved: function(){
			//WIP / Activity container
			var config1 = savedConfiguration.Activity_WIP;
			var actWindow = this.getView().byId("activityFeedContainer");
			var prodWindow = this.getView().byId("productionTrackingContainer");
			if(config1 === "WIP"){
				prodWindow.setVisible(true);
				actWindow.setVisible(false);
			}
			else if(config1 === "Activity"){
				prodWindow.setVisible(false);
				actWindow.setVisible(true);
			}
		},
		
		
		
		
		//-----------------------------------------------------------
		//-----------------------------------------------------------
		//---------------DME Integration
		//-----------------------------------------------------------
		//-----------------------------------------------------------
		
		openDMELineMonitor: function(){
			MessageToast.show("Order number 1241405  submitted with 50 items.");

			
			//this.dmeOrderNumber = '1003275';
			// console.log(this.dmeOrderNumber);
			// if(this.dmeOrderNumber.length < 6){
			// 	MessageToast.show("Make sure to release an order before opening line monitor.");
			// }else{
			// 	var win = window.open('https://dmelinemonitor-sdciot.dispatcher.hana.ondemand.com/index.html?hc_reset#/'+this.dmeOrderNumber,'_blank');
			// 	win.focus();
			// }
		},
	
		//Get the list of order items
		getListofDMEOrderItems: function(){
			var that = this;
			this.openSideMenu(); //Close popup
			
			//Popup for entering order number
			var dialog = new Dialog({
				title: 'DMC Order Number',
				type: 'Message',
				content: [
					new VerticalLayout({
						content: [
							new Text({text: 'Enter Order Number from DMC system.'}),
							new Text({text: '\u00a0'}),
							new HorizontalLayout({
								content: [
									new VerticalLayout({
										content: [
											new Title({text: 'Order number: ' }),
											new Input('dmeOrderNumberInput', {
												placeholder: 'Order Number..',
												type: "Number"
											})
										]
									}),
									new Text({text: '\u00a0 \u00a0'}),
									new VerticalLayout({
										content: [
											new Title({text: 'Qantity to release: ' }),
											new Input('dmeOrderReleaseQuantity', {
												placeholder: 'Max: 50',
												value: 50,
												type: "Number",
												maxLength: 2
											})
										]
									})
								]
							})
						]
					})
				],
				beginButton: new Button({
					text: 'Submit',
					press: function () {
						this.dmeOrderNumber = sap.ui.getCore().byId('dmeOrderNumberInput').getValue();
						var dmeOrderQuantity = parseInt(sap.ui.getCore().byId('dmeOrderReleaseQuantity').getValue(), 10);
						
						if(dmeOrderQuantity<= 50 && dmeOrderQuantity > 0 && this.dmeOrderNumber.length >0){
							MessageToast.show("Realeasing Order: Wait for complete message..");
							dialog.close();
							that.submitDMEOrderRealease(this.dmeOrderNumber, dmeOrderQuantity);
						}
						else{
							MessageToast.show("Order quantity must be between 1-50 and Order Number must be filled out.");
						}
					}
				}),
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
		},
		
		
		submitDMEOrderRealease: function(orderNumber, dmeOrderQuantity){
			// console.log("Post Order");
			var orderData = {
				"shopOrder": orderNumber,
				"quantityToRelease": dmeOrderQuantity
			};
			sap.ui.core.BusyIndicator.show();
			
			jQuery.ajax({
				"url": "/DME_ReleaseOrder_solex",
				"method": "POST",
				"headers": {
					"Content-Type": "application/json",
					"x-dme-plant": "DIFA"
				},
				"data": JSON.stringify(orderData),
				"success": function (response) {
					console.log("DME order data:");
					console.log(response);
					MessageToast.show("Order number "+orderNumber+" submitted with "+dmeOrderQuantity+" items.");
					dmeActiveItems = response.releasedSfcs; //List of order items release
					sap.ui.core.BusyIndicator.hide();
				},
				"error": function (err) {
					console.log("Error getting order");
					//console.log(err);
					MessageToast.show("Error releasing order. Check order number and quantity.");
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},
		
		
		parseDMEData: function(msg){
			if(dmeActiveItems){
				// console.log("DMEAI BEFORE conversion:");
				// console.log(dmeActiveItems);
				if(dmeActiveItems.length>0){
					for(var i=0;i<dmeActiveItems.length;i++){
						if(!dmeActiveItems[i].assetID){
							dmeActiveItems[i].assetID = msg.ASSETID;
							dmeActiveItems[i].location = msg.LOCATIONID; //ID of scanner
							dmeActiveItems[i].time = msg._MESSAGEGATEWAY_TIMEMILLISECONDS; //Time of ball scan
							dmeActiveItems[i].operation = "ASSEMBLE"; //Operation name PAINTING
							dmeActiveItems[i].resource = "BR-ASSY001"; //Resource
							this.sendDMEStart(i);//Send index of item for use
							break;
						}
						else if(dmeActiveItems[i].assetID === msg.ASSETID){
							this.sendDMEStart(i);
							break;
						}
					}
				}
			}
		},
		
		
		sendDMEStart: function(index){
			var that = this;
			var startData = {
				sfcs: [dmeActiveItems[index].sfc],
				operation: dmeActiveItems[index].operation,
				resource: dmeActiveItems[index].resource,
				quantity: dmeActiveItems[index].quantity
			};
			
			// resource: "DEFAULT",
			// resource: "AE-PREP001",
			
			jQuery.ajax({
				"url": "/DME_Orbit_Start_solex",
				"method": "POST",
				"headers": {
					"Content-Type": "application/json",
					"x-dme-plant": "DIFA"
				},
				"data": JSON.stringify(startData), //Must stringify data to send
				"success": function (response) {
					console.log("DME start response:");
					console.log(response);
					setTimeout(function(){	that.sendDMEStop(index);},5000);//Call stop function after 5 seconds
				},
				"error": function (err) {
					console.log("Error sending start operation");
					console.log(err);
				}
			});
		},
		
		
		sendDMEStop: function(index){
			var stopData = {
				sfcs: [dmeActiveItems[index].sfc],
				operation: dmeActiveItems[index].operation,
				resource: dmeActiveItems[index].resource,
				quantity: dmeActiveItems[index].quantity
			};
			
			// console.log("StopData");
			// console.log(stopData);
			jQuery.ajax({
				"url": "/DME_Orbit_Complete_solex",
				"method": "POST",
				"headers": {
					"Content-Type": "application/json",
					"x-dme-plant": "DIFA"
				},
				"data": JSON.stringify(stopData), //Must stringify data to send
				"success": function (response) {
					console.log("DME complete response:");
					console.log(response);
					dmeActiveItems[index].operation = response.queuedOperation;
					dmeActiveItems[index].resource = "BR-INSPECT";
					
				},
				"error": function (err) {
					console.log("Error sending complete operation");
					console.log(err);
				}
			});
		},
		
		
		openSFCMonitor: function(){
			var oView = this.getView();
			var oDialog = oView.byId("SFCMonitorViewID");
			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(oView.getId(), "Orbit.view.SFCMonitor", this);
				oView.addDependent(oDialog);
			}
			this.openSideMenu(); //Close popup
			oDialog.open();
		}, 
		
		closeSFCMonitor: function(){
			this.getView().byId("SFCMonitorViewID").destroy();
		},
		
		
		
		
		
		//-----------------------------------------------------------
		//-----------------------------------------------------------
		//---------------Notifications and Integrations
		//-----------------------------------------------------------
		//-----------------------------------------------------------
		//Open notification settings
		openNotificationSettings: function(){
			var oView = this.getView();
			var oDialog = oView.byId("notificationSettingsDialog");
			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(oView.getId(), "Orbit.view.NotificationSettings", this);
				oView.addDependent(oDialog);
			}
			oDialog.open();
			this.setInputFieldValues();
			
			var sideMenu = this.getView().byId("sideMenuID");
			sideMenu.setVisible(false);
		},
		
		//Pull saved data
		setInputFieldValues: function(){
			var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			var integrationSettings = oStorage.get("IntegrationSettings");
			if(integrationSettings){
				if(integrationSettings.counterfeitIDValue){
					this.getView().byId("errorBallInput").setValue(integrationSettings.counterfeitIDValue);
				}
				this.getView().byId("quantityToGenerateNotification").setValue(integrationSettings.numberFailingToTriggerNotification);
				this.getView().byId("rulesSMSCheckbox").setSelected(integrationSettings.SMS.Active);
				this.getView().byId("rulesSMSPhone").setValue(integrationSettings.SMS.Number);
				this.getView().byId("rulesSMSMessage").setValue(integrationSettings.SMS.Message);
				this.getView().byId("rulesS4HanaActive").setSelected(integrationSettings.S4HANA.Active);
				this.getView().byId("rulesC4CActive").setSelected(integrationSettings.C4C.Active);
				this.getView().byId("rulesInputC4CTenant").setValue(integrationSettings.C4C.Tenant);
				this.getView().byId("rulesInputC4CMessage").setValue(integrationSettings.C4C.Message);
				this.getView().byId("rulesAribaCheckbox").setSelected(integrationSettings.Ariba.Active);
			}
			// var notificationSettingsModel = sap.ui.getCore().getModel("IntegrationSettings").getData();
			// sap.ui.getCore().getModel("IntegrationSettings").setData(notificationSettingsModel);
			
		},
		
		
		checkCounterfeitBall: function(ballID){
			// var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			// var integrationSettings = oStorage.get("IntegrationSettings");
			//console.log("Compare: New - "+ ballID +", Error - "+integrationSettings.counterfeitIDValue); //Delete

			var dialog = new Dialog({
				title: 'ERROR DETECTED!',
				type: 'Message',
				state: 'Error',
				content: [
					new Title({text: "Error! Invalid ID \""+ballID+"\" Found!" })
				],
				endButton: new Button({
					text: 'Okay',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			dialog.open();
			
			console.log("Dialog");
			console.log(dialog);
			
			setTimeout(function(){ dialog.destroy(); }, 5000);//Call stop function after 5 seconds
		},
		
		
		sendIntegrationMessages: function(){
			var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			var integrationSettings = oStorage.get("IntegrationSettings");
			
			//SMS Message
			if(integrationSettings.SMS.Active === true){
				var self = this;
				self.webSocket = null;
				self.webSocket = new WebSocket("wss://mgwws.hana.ondemand.com/endpoints/v1/ws");
				self.webSocket.attachOpen(function () {
	
					// Replace Subscribe Message with your Own
					var subscribe = "{subscribe: 'out/sgw/orbitSMS'}";
	
					self.webSocket.send(subscribe);
	
					var payload = {
						clientId:"orbitSMS",
						topic:"in/sgw/dev",
						metadata:false,
						serviceId:10,
						inputParams:{
							dest: integrationSettings.SMS.Number,
							contents: integrationSettings.SMS.Message,
							type:"httpclient"
						}
					};
					
					// 	dest: integrationSettings.SMS.Number,
					// contents: integrationSettings.SMS.Message
	
					self.webSocket.send(JSON.stringify(payload));
	
				});
	
				self.webSocket.attachMessage(function (evt) {
					var message = evt.getParameters().data;
					var messageParse = JSON.parse(message);
					if (messageParse.inputParams) {
						self.inputParameters = messageParse.inputParams;
	
					}
					MessageToast.show("SMS notification successfully sent to technician.");
					console.log(message);
	
				});
	
				self.webSocket.attachError(function (evt) {
					MessageToast.show("Error sending text.");
					// console.log(evt);
				});
	
				self.webSocket.attachClose(function (evt) {
					// console.log("Connection closed.");
				});
			}
			
			//S4 HANA
			if(integrationSettings.S4HANA.Active === true){
				//SEND S4
			}
			
			//C4C
			if(integrationSettings.C4C.Active === true){
				var obj = {
					customerName: "Live Digital Manufacturing system down.",
					message: integrationSettings.C4C.Message,
					tenant: integrationSettings.C4C.Tenant
				};
				// SEND C4C
			}
			
			//Ariba
			if(integrationSettings.Ariba.Active === true){
				var obj = {
					sensor: "Purchase Live Digital Manufacturing."
				};
				// SEND ARIBE
			}
			
		},
		

		closeNotificationSettingsDialog: function () {
			var integrationSettingsModel =  {
				counterfeitIDValue: this.getView().byId("errorBallInput").getValue(),
				numberFailingToTriggerNotification: this.getView().byId("quantityToGenerateNotification").getValue(),
				SMS: {
					Active: this.getView().byId("rulesSMSCheckbox").getSelected(),
					Number: this.getView().byId("rulesSMSPhone").getValue(),
					Message: this.getView().byId("rulesSMSMessage").getValue()
				},
				S4HANA: {
					Active: this.getView().byId("rulesS4HanaActive").getSelected()
				},
				C4C: {
					Active: this.getView().byId("rulesC4CActive").getSelected(),
					Tenant: this.getView().byId("rulesInputC4CTenant").getValue(),
					Message: this.getView().byId("rulesInputC4CMessage").getValue()
				},
				Ariba: {
					Active: this.getView().byId("rulesAribaCheckbox").getSelected()
				}
			};
			// sap.ui.getCore().getModel("IntegrationSettings").setData(integrationSettingsModel);
			
			jQuery.sap.require("jquery.sap.storage");
			var	oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			oStorage.put("IntegrationSettings", integrationSettingsModel);
			// oStorage.put("IntegrationSettings", sap.ui.getCore().getModel("IntegrationSettings").getData());

			this.getView().byId("notificationSettingsDialog").close();
		},
		
	
		
		sendTestScan: function () {
			var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			var integrationSettings = oStorage.get("IntegrationSettings");

			if(integrationSettings.SMS.Active === true){
				var self = this;
				self.webSocket = null;
				self.webSocket = new WebSocket("wss://mgwws.hana.ondemand.com/endpoints/v1/ws");
				self.webSocket.attachOpen(function () {
	
					// Replace Subscribe Message with your Own
					var subscribe = "{subscribe: 'out/sgw/orbitSMS'}";
	
					self.webSocket.send(subscribe);
	
					var payload = {
						clientId:"orbitSMS",
						topic:"in/sgw/dev",
						metadata:false,
						serviceId:10,
						inputParams:{
							dest: integrationSettings.SMS.Number,
							contents: integrationSettings.SMS.Message,
							type:"httpclient"
						}
					};
					
					// 	dest: integrationSettings.SMS.Number,
					// contents: integrationSettings.SMS.Message
	
					self.webSocket.send(JSON.stringify(payload));
	
				});
	
				self.webSocket.attachMessage(function (evt) {
					var message = evt.getParameters().data;
					var messageParse = JSON.parse(message);
					if (messageParse.inputParams) {
						self.inputParameters = messageParse.inputParams;
	
					}
					MessageToast.show("SMS notification successfully sent to technician.");
					console.log(message);
	
				});
	
				self.webSocket.attachError(function (evt) {
					MessageToast.show("Error sending text.");
					// console.log(evt);
				});
	
				self.webSocket.attachClose(function (evt) {
					// console.log("Connection closed.");
				});
			}
		}
		
		
		

	});

	return ViewController;
});