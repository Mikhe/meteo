function app() {
    var _this = this,
        currentChartType = "temperature",   // default type of request
        chartWrap,                          // chart container
        periodBorders = {                   // period min & max
            from: 1881,
            to: 2006        
        },
        canvas,                 
        ctx,
        chartConfig = {                     // parameters of rendering
            "temperature": {
                mult: 15,                   // multiplier kinda zoom
                baseLine: true,             // existance of a baseline
                baseLineLevel: 120,         // baseline position
                baseLineWidth: 1,           
                baseLineColor: "#000000",
                color: "#FF0000",
                lineWidth: 2,               // chart line width
                legendPosition: 230,        
                coordCount: 5,              // quantity of background lines
                coordStep: 20               // distance between lines
            },
            "precipitation": {
                mult: 80,
                baseLine: true,
                baseLineLevel: 230,
                baseLineWidth: 1,
                baseLineColor: "#000000",
                color: "#0000FF",
                lineWidth: 2,
                legendPosition: 40,
                coordCount: 9,
                coordStep: 20
            },
            "defaults": {
                step: 10,                   // distance between points of a chart
                coordLineWidth: 0.1,        
                coordLineColor: "#000000",
                coordAreaSize: 20,          // width of area for marks
                marginRight: 10,            // margin right for a chart
                coordTextMargin: 2,         // margin-top for marks
                coordAreaMarginPos: 3,      // margin-left for positive marks
                coordAreaMarginNeg: 0,      // margin-left for negative marks
                fontSize: "10px Arial"
            }
        },    
        query = {                           // default query
            from: 1881,
            to: 2006
        },
        oldQuery = {},                      // previous query
        btns,                               // array of button controls
        slts,                               // array of select controls
        worker,                             // current worker
    
    /*
    * function renders a chart
    *
    * @param {array} data                   -  data array
    */
    render = function(data) {
        // clean the canvas
        ctx.clearRect(0,0,canvas.width, canvas.height); 
        
        if (Array.isArray(data) && data.length) {
            // if have found a chart config
            if (chartConfig[currentChartType]) {
                
                var cfg = chartConfig[currentChartType];
                var step = chartConfig.defaults.step;           
                var len = data.length; 
                var caz = chartConfig.defaults.coordAreaSize;
                var mr = chartConfig.defaults.marginRight;
                
                // calculate a chart width & a distance between points
                if (len < (chartConfig.defaults.width - caz -mr) / step) {
                    step = (chartConfig.defaults.width - caz - mr) / (len == 1 ? 1 : (len-1));
                    canvas.width = chartConfig.defaults.width;
                } else {
                    canvas.width = step * len + caz + mr;
                }
                
                // if there is a base line - draw it
                if (cfg.baseLine) {
                    ctx.beginPath();
                    ctx.strokeStyle = cfg.baseLineColor;
                    ctx.lineWidth = cfg.baseLineWidth;
                    ctx.moveTo(caz, cfg.baseLineLevel);
                    ctx.lineTo(step * (len-1) + caz, cfg.baseLineLevel);
                    ctx.stroke();
                }    
                
                // draw a chart line
                ctx.beginPath();
                ctx.strokeStyle = cfg.color;
                ctx.lineWidth = cfg.lineWidth;
                
                // look up points
                data.every(function(item, i) {
                    if (item && typeof item.v == "number") {
                        // value of a point
                        var val = item.v.toFixed(1);
                        
                        // if there is a multiplier
                        if (typeof cfg.mult == "number")
                            val = val * cfg.mult;
                        
                        // if a position depends on a baseline
                        if (cfg.baseLineLevel) {
                            if (val < 0) val = cfg.baseLineLevel + Math.abs(val);
                            else val = cfg.baseLineLevel - val;
                        }    
                        
                        // set a position
                        if (i == 0) ctx.moveTo(caz, val)
                        else ctx.lineTo(i * step + caz, val);
                        
                        // indicate a point
                        ctx.arc(i * step + caz, val, 1, 0, 2 * Math.PI);
                        
                        // draw labels for every second point
                        if (i%2 == 1) {
                            ctx.save();
                            ctx.translate(step * i + caz, cfg.legendPosition);
                            ctx.font = chartConfig.defaults.fontSize;
                            ctx.rotate(Math.PI / 2 * 3);
                            ctx.fillText(item.t, 0, 0);
                            ctx.restore();
                        }    
                    }    
                    return true;
                })
                
                // render background lines
                ctx.stroke();
                ctx.font = chartConfig.defaults.fontSize;
                for (var i = 1; i < cfg.coordCount; i++) {
                    var pos = i * cfg.coordStep;
                    var val = (pos / cfg.mult).toFixed(1);
                    
                    // a mark above a base line
                    ctx.fillText(val, chartConfig.defaults.coordAreaMarginPos, cfg.baseLineLevel - pos - chartConfig.defaults.coordTextMargin);
                    // a line above a base line
                    ctx.beginPath();
                    ctx.strokeStyle = chartConfig.defaults.coordLineColor;
                    ctx.lineWidth = chartConfig.defaults.coordLineWidth;
                    ctx.moveTo(0, cfg.baseLineLevel - pos);
                    ctx.lineTo(canvas.width, cfg.baseLineLevel - pos);
                    ctx.stroke();
                    // a mark under a base line
                    ctx.fillText(-val, chartConfig.defaults.coordAreaMarginNeg, cfg.baseLineLevel + pos - chartConfig.defaults.coordTextMargin);
                    // a line above a base line
                    ctx.beginPath();
                    ctx.strokeStyle = chartConfig.defaults.coordLineColor;
                    ctx.lineWidth = chartConfig.defaults.coordLineWidth;
                    ctx.moveTo(0, cfg.baseLineLevel + pos);
                    ctx.lineTo(canvas.width, cfg.baseLineLevel + pos);
                    ctx.stroke();
                }    
            }    
        }    
    },
    
    /*
    * function is the handler for select controls
    *
    * @param {object} e             - event                   
    */
    queryChange = function(e) {
        var el = e.target;                          
        var param = el.getAttribute("name");            
        var val = Number(el.options[el.selectedIndex].value);
        if (typeof param == "string") {
            // set a query param
            query[param] = val;
            
            // validation values
            if (param == "from") {
                if (val > query.to)  {
                    query.to = val;
                    for (var i = 0; i < slts.length; i++) {
                        var el = slts[i];
                        if (el.getAttribute("name") == "to") el.value = val;
                    }
                }
            } else if (param == "to") {
                if (val < query.from)  {
                    query.from = val;
                    for (var i = 0; i < slts.length; i++) {
                        var el = slts[i];
                        if (el.getAttribute("name") == "from") el.value = val;
                    }
                }
            }
        }    
        
        show();
    },

    /*
    * function is the handler for select data
    *
    * @param {object} e      s - could be called from a button onclick handler              
    */
    show = function(e) {
        // if it's called form a buttn handler
        if (e) {
            // detect a chart type
            var type = e.target.getAttribute("data-type");
            if (type) {
                // if it's the same query skip it
                if (type == currentChartType && JSON.stringify(oldQuery) == JSON.stringify(query)) {
                    return;
                } else {
                    // if it's new chart type
                    currentChartType = type;
                }
            }    
        }
        
        if (JSON.stringify(query) == JSON.stringify(periodBorders)) query = {};
        
        // saving a query
        oldQuery = Object.assign({}, query);
        
        // kill the previos process
        if (worker && worker.terminate) worker.terminate();
        
        // start new one
        worker = new Worker("js/request.js");
        
        // getting answer callback
        worker.onmessage = function (mes) {
            if (mes && mes.data) {
                render(mes.data);
                chartWrap.scrollLeft = 0;
            }    
        }
        // error handler
        worker.onerror = function(err) {
            console.error("worker error: ", err.message);
        }
        
        // send request
        worker.postMessage({table: currentChartType, query: query});
    },

    /*
    * function inits the page app
    */
    init = function() {
        btns = document.getElementsByTagName("button");
        slts = document.getElementsByTagName("select");
        chartWrap = document.getElementsByClassName("chartWrap")[0];
        canvas = document.getElementById("canvas");
        ctx = canvas.getContext("2d");
        chartConfig.defaults.width = canvas.width;
        
        // wrapper for selects
        var options = document.createElement("div");
        
        // set button handler
        for (var i = 0; i < btns.length; i++) {
            btns[i].onclick = show;
        }
        
        // create select options
        for (var i = periodBorders.from; i <= periodBorders.to; i++ ) {
            var opt = document.createElement("option");
            opt.appendChild(document.createTextNode(i));
            opt.setAttribute("value", i);
            options.appendChild(opt);
        }
        
        // fill selects and set handler
        for (var i = 0; i < slts.length; i++) {
            var el = slts[i];
            el.innerHTML = options.innerHTML;
            if (el.getAttribute("name") == "to") el.value = 2006;
            el.onchange = queryChange;
        }
        
        show();
    }
    
    return {
        init: init
    }   
}    

document.addEventListener("DOMContentLoaded", (new app()).init, false);