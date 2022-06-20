function Gauge(gaugeName){
	
	var containerID = document.getElementById(gaugeName);
	// progressbar.js@1.0.0 version is used
	// Docs: http://progressbarjs.readthedocs.org/en/1.0.0/
	
	
	var bar = new ProgressBar.Circle(containerID, {
	  strokeWidth: 15,
	  color: '#aaa',
	  trailColor: '#eee',
	  trailWidth: 10,
	  easing: 'easeInOut',
	  duration: 1400,
	  svgStyle: null,
	  text: {
	    value: '',
	    alignToBottom: true
	    
	  },
	  from: {color: '#008FD3'}, //#ED6A5A
	  to: {color: '#008FD3'}, //#41f48c
	  // Set default step function for all animate calls
	  step: (state, bar) => {
	    bar.path.setAttribute('stroke', state.color);
	    var value = Math.round(bar.value() * 100);
	    if (value === 0) {
	      bar.setText("0%");
	    } else {
	      bar.setText(value +'%');
	    }
	
	    bar.text.style.color = state.color;
	  }
	});
	bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
	bar.text.style.fontSize = '2rem';
	bar.text.style.marginTop = '0px';
	
	
	
	this.capacity = function(x){
		//var x = Math.floor((Math.random()*100.00))/100.00;
		//document.getElementById("text").innerHTML = x;
		bar.animate(x);  // Number from 0.0 to 1.0
	}
	
	//setInterval(capacity, 2400);
	
}