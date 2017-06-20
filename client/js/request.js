// availabe tables
var tables = ["temperature", "precipitation"];

/*
 * function aggregates data by a period
 *
 * @param  {array}  data      - data
 * @param  {string} type	  - period  
 * @return {array}  items     - aggregated data
 */
function aggregation(data, type) {
	var period;							// counting period
	var len = data.length - 1;			
	var periodAVG = 0;					// average value for a period
	var periodCNT = 0;					// quantity of points
	var items = [];						// result array
	
    data.forEach(function(item, i){
    	// current period
		var cp = type == "month" ? item.t.split("-").splice(0,2).join("-") : item.t.split("-")[0];
		
		if (!period) period = cp;
		
		// if it's still the same period
		if (cp == period) {
			periodAVG += item.v
			periodCNT++;
		}	
		
		// if new one
		if (cp != period || i == len) {
			items.push({ t: period, v: Number((periodAVG/periodCNT).toFixed(1))});
			periodAVG = item.v;
			periodCNT = 1;
			period = cp;
		}	
	})
	
	return items;
}

/*
 * function the worker handler
 *
 * @param  {object}  e        - event
 */
onmessage = function(e) {
	try {
	    var table = e.data.table;				// a table in the database
	    var query = e.data.query;				// query params
	    
	    // request to the database
	    getStorage(table, query, function(res){
	        if (res && res.length) {
	        	// if found data
	            postMessage(res);
	        } else {
	        	// a request to a server
	            var xhr = new XMLHttpRequest();
	
	            xhr.open('GET', ['/data/', table, '.json'].join(""), false);
	
	            xhr.send();
	
	            if (xhr.status != 200) {
	                console.error( xhr.status + ': ' + xhr.statusText ); 
	            } else {
	            	// got data then process it
	                try {
	                    res = aggregation(JSON.parse(xhr.responseText), "month");
	                } catch(e) {
	                    console.error("parsing answer error: ", e);     
	                }
	                //put data into the database
	                setStorage(table, res);
	                //return data to app
	                postMessage(aggregation(res, "year"));
	            }      
	        }
	    })
	} catch(e) {
		console.error("worker onmessage error: ", e)
	}
};

/*
 * function inits a connec to the database
 *
 * @param  {string}   table        - a table in the databse
 * @param  {function} f            - a callback
 */
function connectDB(table, f) {
    var request = indexedDB.open("meteo", 1);
    request.onerror = console.error;
    // if successfuly opened
    request.onsuccess = function(e){
	    if (f && typeof f == "function") {
	        f(request.result);
	    }
    }
    // if we have to create new one
    request.onupgradeneeded = function(e){
        var db = e.currentTarget.result;
        // create tables
        tables.forEach(function(t){
        	var objectStore = db.createObjectStore(t, { keyPath: "t" });
        	objectStore.createIndex("v", "v", { unique: false });
        })
	    connectDB(f);
    }
}

function filterData(query, data) {
	try {
		var from = query.from;
		var to = query.to;
		var year = Number(data.t.split("-")[0]);
		
		if (from) {
			if (year < from ) return false;
		}
		if (to) {
			if (year > to ) return false;
		}
	} catch(e) {
		console.error("filter error: ", e);
	}
	return true;
}

/*
 * function gets data from the database
 *
 * @param  {string}   table        - a table in the databse
 * @param  {object}   query        - a query params
 * @param  {function} f            - a callback
 */
function getStorage(table, query, f) {
	connectDB(table, function(db){
		var rows = [],
			store = db.transaction([table], "readonly").objectStore(table);

		if(store.mozGetAll)
			store.mozGetAll().onsuccess = function(e){
				var data = e.target.result;
				// filter & aggregate data
				f(aggregation(data.filter(filterData.bind(this, query)), "year"));
			};
		else {
			
			// filter data
			store.openCursor().onsuccess = function(e) {
				var cursor = e.target.result;
				if(cursor && cursor.value){
					if (filterData(query, cursor.value)) rows.push(cursor.value);
					cursor.continue();
				}
				else {
					f(aggregation(rows, "year"));
				}
			};
		}	
	});
}

/*
 * function sets data from the database
 *
 * @param  {string} table        - a table in the databse
 * @param  {array}  items        - new data
 */
function setStorage(table, items) {
	connectDB(table, function(db){
	    var request = db.transaction([table], "readwrite");
	    
	    items.forEach(function(item){
	    	request.objectStore(table).put(item);
	    })
		request.onerror = console.error;
		request.onsuccess = function(){
			return request.result;
		}
	});
}