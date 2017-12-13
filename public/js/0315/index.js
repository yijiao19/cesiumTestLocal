//// version:1.0        author:sunzq        Email:zengqiang365@163.com
var airView = initViewer('#cesiumContainer', "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage",
  "http://10.192.25.154:4002/?", {
    satelliteMapUrl: 'http://localhost:4002/maps/satellite/{z}/{x}/{y}.png',
    streetMapUrl: 'http://localhost:4002/maps/street/{z}/{x}/{y}.png',
    //terrainMapUrl: 'http://localhost:4002/maps/terrain_tiles/',
    defaultLonEnt: 119,
    defaultLatEnt: 100,
    realHeight: false
    //realHeight: true
  })
airView.setFocus(119, 40, 10000000.0);
airView.start();
setTimeBar();

//--------------------经/纬/高/值筛选器-----------------------------------------------
var filterArray = ["#lat", "#long", "#height", "#ansi"];
//创建筛选器
function buildFilters(farray) {
  farray.forEach(function(val) {
    var tmpslider = $(val).slider({
      tooltip: 'always',
      tooltip_position: 'bottom',
    });
    tmpslider.on("slide slideStop", function(event) {
      airView.setShowRange({
        latRange: $('#lat').val().split(","),
        lonRange: $('#long').val().split(","),
        heightRange: $('#height').val().split(","),
        valRange: $('#ansi').val().split(",")
      })
    });
  })
}
buildFilters(filterArray);

//选择不同高度时显示不同datasource
$("[name=pollutRadios]").on('click', function() {
  var layer = this.value;
  airView.setOverlay(layer);
  var range = airView.getOverlay().valueRange;
  $("#ansi").slider('destroy');
  $("#ansi").slider({
    min: range.min,
    max: range.max,
    step: range.step,
    value: range.value,
    tooltip: 'always',
    tooltip_position: 'bottom'
  });
  $("#ansi").on("slide", function(slideEvt) {
    airView.setShowRange({
      latRange: $('#lat').val().split(","),
      lonRange: $('#long').val().split(","),
      heightRange: $('#height').val().split(","),
      valRange: $('#ansi').val().split(",")
    })
  });
  airView.reloadData();
  reBuildImage();
})

$("[name='pblhcheck']").on('click', function() {
  var checked = $("input[name='pblhcheck']").is(':checked');
  checked ? airView.showPBLH() : airView.hidePBLH();
})

//-------------------时间导航---------------------------------------------------------
function setTimeBar() {
  var conf = airView.getConfig();
  $("#timeLabel").html(conf.time.utc().format("YYYY-MM-DD HH:mm:ss") + " UTC");
  $("#verContentLable").html("2017-05-19T09:00:00.000Z" + " UTC " + conf.overlayType);
}

function setConfigTime(num) {
  airView.setDate(num);
  setTimeBar();
  reBuildImage();
}
$("#nav-forward").click(function(event) {
  event.preventDefault();
  setConfigTime(1);
})
$("#nav-forward-more").on("click", function(event) {
  event.preventDefault();
  setConfigTime(24)
});
$("#nav-backward").on("click", function(event) {
  event.preventDefault();
  setConfigTime(-1)
});
$("#nav-backward-more").on("click", function(event) {
  event.preventDefault();
  setConfigTime(-24)
});

//--------------------------设置色度板及地图变更------------------------------------
function initColorBar() {
  //获取色板信息，并绑定到下拉菜单
  var colors = colortable.getColors();
  colors.unshift("标准");
  d3.select("#colorArray").selectAll("option")
    .data(colors).enter()
    .append("option").text(function(d) {
      return d
    });
  //在色板元素上创建canvas
  var width = document.body.offsetWidth * 0.25 * 0.7;
  var colorBar = d3.select('#colorbar').append('canvas').attr("width", width).attr(
    "height", 20);

  //绘制颜色比例尺
  airView.renderColorScale($("#colorArray option:selected").val(), colorBar);

  $("#colorArray").change(function() {
    airView.renderColorScale($("#colorArray option:selected").val(),
      colorBar);
    airView.recolor();
  });
}
initColorBar();

//绑定地图的change事件，当选择不同的地图时调用 SelectChange()方法
$("#selectMap").change(function() {
  airView.changeMap($('#selectMap option:selected').val());
});

//------------------------------垂直剖面图相关--------------------------------------

//设置垂直剖面图的展示
var chartArray = [

  {
    id: "chart1",
    imageID: "horiImage",
    name: "水平剖面图",
    vtype: "h",
    initNum: "0.5"
  }, {
    id: "chart2",
    imageID: "longImage",
    name: "经向垂直剖面图",
    vtype: "lon",
    initNum: "84.95"
  }, {
    id: "chart3",
    imageID: "latImage",
    name: "纬向垂直剖面图",
    vtype: "lat",
    initNum: "14.95"
  }, {
    id: "chart1-1",
    name: "test",
    vtype: "lon",
    initNum: "84.95"
  }, {
    id: "chart2-1",
    name: "test",
    vtype: "lat",
    initNum: "14.95"
  }, {
    id: "chart3-1",
    name: "test",
    vtype: "h",
    initNum: "0.5"
  }
//test渲染图片、xxxImage渲染Plotly矢量图
];

var longslider;
var latslider;
var heightslider;

//绘制剖面图图像
function drawLon(pathhh) {
  airView.setLonImage(pathhh);
}

function drawLat(pathhh) {
  airView.setLatImage(pathhh);
}

function drawHeight(pathhh) {
  airView.setHeightImage(pathhh);
}

//根据网格数据设置剖面的位置、图像
function buildVlonSlider() {
  longslider = $("#vertical-long").slider({
    tooltip: 'always',
    tooltip_position: 'bottom',
  });
  longslider.on("slideStop", function(event) {
    var lonNum = $('#vertical-long').val() - 0.05;

    airView.setLonEntPosition(lonNum);
    drawImage(chartArray[3].id, chartArray[3].name, chartArray[3].vtype,
      lonNum, drawLon);

  });
}


buildVlonSlider();

function buildVlatSlider() {
  latslider = $("#vertical-lat").slider({
    tooltip: 'always',
    tooltip_position: 'bottom',
  });
  latslider.on("slideStop", function(event) {
    var latNum = $('#vertical-lat').val();
    airView.setLatEntPosition(latNum);
    console.log("lat" + latNum);
    drawImage(chartArray[4].id, chartArray[4].name, chartArray[4].vtype,
      latNum, drawLat);
     });
}
buildVlatSlider();

function buildVheightSlider() {
  heightslider = $("#vertical-height").slider({
    tooltip: 'always',
    tooltip_position: 'bottom',
  });
  heightslider.on("slideStop", function(event) {
    var heightNum = $('#vertical-height').val();
    airView.setHeightEntPosition(heightNum - 0.5);
    drawHeightImage(chartArray[5].id, chartArray[5].name,
      heightNum, drawHeight);
  });
}
buildVheightSlider();

//切换数据滤镜和垂直剖面图的标签
$(".tab-btn").click(function() {
  $(".tab-btn").removeClass("btn-primary");
  $(this).addClass("btn-primary");
  var tabName = $("input[name='taboptions']:checked").attr('id');
  if (tabName == "vertical") {
    $("#form-filter").attr('style', "display:block");
    $("#form-vertical").attr('style', "display:none");
    $("#charts").attr('style', "display:none");
    airView.setVerticalHide();
  } else {
    $("#form-filter").attr('style', "display:none");
    $("#form-vertical").attr('style', "display:block");
    $("#charts").attr('style', "display:block");
    airView.setVerticalShow();
  }
});


function initProfile() {
  var maxwidth = document.body.offsetWidth * 0.6;
  var maxheight = window.screen.availHeight * 0.75;
  var margin = {
      top: 19.5,
      right: 19.5,
      bottom: 19.5,
      left: 19.5
    },
    width = maxwidth - margin.right,
    height = maxheight - margin.bottom;
  var margin_chart = maxwidth * 0.2 + 20;

  chartArray.forEach(function(chart, index) {


    // //Create the SVG container and set the origin.
    id = '#' + chart.id;
    var div = d3.select(id)
      .style({
        'margin-left': margin_chart * index + "px"
      });

    //绘制plotly
    if (index < 3) {
      //drawPlotly(chart.id, chart.name, chart.vtype, chart.initNum);
    }
    //绘制静态图片png
    else {
      //drawImage(chart.id, chart.name, chart.vtype, chart.initNum);
    }


    d3.selectAll('.profile')
      .style({
        opacity: '0.8',
        filter: "alpha(opacity=80)",
        "-moz-opacity": "0.8",
        "-khtml-opacity": "0.8"
      })
      .on('mouseover', function(d) {
        d3.selectAll('.profile').style({
          opacity: '0.05',
          filter: "alpha(opacity=5)",
          "-moz-opacity": "0.05",
          "-khtml-opacity": "0.05"
        });
        d3.select(this).style({
          opacity: '1.0',
          filter: "alpha(opacity=100)",
          "-moz-opacity": "1.0",
          "-khtml-opacity": "1.0"
        });
      })
      .on('mouseout', function(d) {
        d3.selectAll('.profile').style({
          opacity: '0.8',
          filter: "alpha(opacity=80)",
          "-moz-opacity": "0.8",
          "-khtml-opacity": "0.8"
        })
      })
  })
}

initProfile();

//绘制plotly矢量图
function drawPlotly(graphDiv, name, type, data, callback) {
  var xAxis = new Array(); //x
  var yAxis = new Array(); //y
  var pollute = new Array();

  var coverageId = "wrfchem_ll_4D";
  var ansi = "ansi(%222017-05-19T09:00:00.000Z%22)";
  var bottom_top = "bottom_top(" + data + ")";
  var lat_slicing = "Lat(" + data + ")";
  var long_slicing = "Long(" + data + ")";
  var range = "pm25";
  var format = "application/json";
  var dataType;
  var imgpath;

  switch (type) {
    case "h":
      dataType = bottom_top;
      break;
    case "lon":
      dataType = long_slicing;
      break;
    case "lat":
      dataType = lat_slicing;
      break;
    default:

  }
  var srcPolluteJson =
    "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage" +
    "&COVERAGEID=" + coverageId + "&SUBSET=" + ansi + "&SUBSET=" +
    dataType +
    "&RANGESUBSET=" + range + "&FORMAT=" + format;
  //var srcJson = "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=wrfchem_ll_4D&RANGESUBSET=pm25&FORMAT=application/json";
  console.log(srcPolluteJson);
  Plotly.d3.json(srcPolluteJson, function(figure) {
    pollute = figure;
    for (var i = 0; i < pollute.length; i++)
      for (var j = 0; j < pollute[i].length; j++) {
        if (pollute[i][j] > 1.0e+30) pollute[i][j] = null;
      }
    for (var i = 0; i < 360; i++) {
      xAxis.push(14.95 + 0.1 * i);
    }
    for (var i = 0; i < 30; i++) {
      yAxis.push(84.95 + 0.1 * i);
    }
    //console.log(long);
    var trace = {
      y: yAxis,
      x: xAxis,
      z: figure,
      type: 'heatmap',
      zsmooth: 'best',
      colorscale: 'Jet',
    };

    var data = [trace];

    var layout = {
      title: name,
      xaxis: {
        title: 'latitude',
        dtick: 1,
        ticklen: 18,
      },
      yaxis: {
        title: 'longtitude',
      },

    };
    Plotly.newPlot(graphDiv, data, layout);

  });

}

//绘制水平剖面图+中国地图topojson
function drawHeightImage(graphDiv, name, data, callback) {
  console.log(graphDiv);
  var id = "#" + graphDiv;
  var d3 = Plotly.d3.select(id);
  var img_jpg = d3.select("#img-export");
  var pollute = new Array();

  var coverageId = "wrfchem_ll_4D";
  var ansi = "ansi(%222017-05-19T09:00:00.000Z%22)";
  var bottom_top = "bottom_top(" + data + ")";
  var lat_slicing = "Lat(" + data + ")";
  var long_slicing = "Long(" + data + ")";
  var range = "pm25";
  var format = "application/json";
  var dataType = bottom_top;
  var imgpath;
  
  var srcPolluteJson =
    "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage" +
    "&COVERAGEID=" + coverageId + "&SUBSET=" + ansi + "&SUBSET=" +
    dataType +
    "&RANGESUBSET=" + range + "&FORMAT=" + format;
  //var srcJson = "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=wrfchem_ll_4D&RANGESUBSET=pm25&FORMAT=application/json";
  console.log(srcPolluteJson);
  Plotly.d3.json(srcPolluteJson, function(figure) {
    pollute = figure;
    for (var i = 0; i < pollute.length; i++)
      for (var j = 0; j < pollute[i].length; j++) {
        if (pollute[i][j] > 1.0e+30) pollute[i][j] = null;
      }

    //console.log(long);
    var trace1 = {
      type: 'heatmap',
      z: figure,
      opacity: 1,
      zmax: 100,
      zmin: 0,
      
      zsmooth: 'best',
      colorscale: 'Jet',
      showscale: false,
    };
    var trace2 = {
      type: 'scattergeo',
      mode: 'markers',
      lon: [100],
      lat: [35],
      marker: {
        size: 7,
        color: '#bebada'
      },
    };
    var data = [trace2, trace1];

    var layout = {
      paper_bgcolor: '#7f7f7f',
      width: 1000,
      height: 785.670278904547,
      margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 0,
        pad: 0
      },
      geo: {
        scope: 'asia',
        resolution: 110,
        projection: {
          'type': "equirectangular"
        },
        lonaxis: {
          showgrid: true,
          dtick: 5,
          'range': [85, 131]
        },
        lataxis: {
          showgrid: true,
          dtick: 5,
          'range': [15, 51]
        },
        bgcolor: 'rgba(0,0,0,0)',
        showrivers: false,
        rivercolor: '#fff',
        showlakes: false,
        lakecolor: '#fff',
        showland: false,
        landcolor: '#EAEAAE',
        showcountries: false,
        countrycolor: '#000',
        subunitwidth: 1.5,

        showsubunits: true,
        subunitcolor: '#fff'
      }
    };
    Plotly.newPlot(graphDiv, data, layout)
      .then(
        function(gd) {
          Plotly.toImage(gd, {
              height: 785.670278904547,
              width: 1000
            })
            .then(
              function(url) {
                img_jpg.attr("src", url);
                callback(url);
                return Plotly.toImage(gd, {
                  format: 'png',
                  height: 785.670278904547,
                  width: 1000
                });
              }
            )
        })

    ;

  });

}

//绘制径向纬向剖面图图像
function drawImage(graphDiv, name, type, data, callback) {
  console.log(graphDiv);
  var id = "#" + graphDiv;
  var d3 = Plotly.d3.select(id);
  var img_jpg = d3.select("#img-export");
  var pollute = new Array();

  var coverageId = "wrfchem_ll_4D";
  var ansi = "ansi(%222017-05-19T09:00:00.000Z%22)";
  var bottom_top = "bottom_top(" + data + ")";
  var lat_slicing = "Lat(" + data + ")";
  var long_slicing = "Long(" + data + ")";
  var range = "pm25";
  var format = "application/json";
  var dataType;
  var imgpath;
  switch (type) {
    case "h":
      dataType = bottom_top;
      break;
    case "lon":
      dataType = long_slicing;
      break;
    case "lat":
      dataType = lat_slicing;
      break;
    default:

  }
  var srcPolluteJson =
    "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage" +
    "&COVERAGEID=" + coverageId + "&SUBSET=" + ansi + "&SUBSET=" +
    dataType +
    "&RANGESUBSET=" + range + "&FORMAT=" + format;
  //var srcJson = "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=wrfchem_ll_4D&RANGESUBSET=pm25&FORMAT=application/json";
  console.log(srcPolluteJson);
  Plotly.d3.json(srcPolluteJson, function(figure) {
    pollute = figure;
    for (var i = 0; i < pollute.length; i++)
      for (var j = 0; j < pollute[i].length; j++) {
        if (pollute[i][j] > 1.0e+30) pollute[i][j] = null;
      }

    //console.log(long);
    var trace1 = {
      type: 'heatmap',
      z: figure,
      opacity: 1,
      zmax: 100,
      zmin: 0,
  
      zsmooth: 'best',
      colorscale: 'Jet',
      showscale: false,
    };
   
    var data = [trace1];

    var layout = {
      paper_bgcolor: '#7f7f7f',
      margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 0,
        pad: 0
      },
 
    };
    Plotly.newPlot(graphDiv, data, layout)
      .then(
        function(gd) {
          Plotly.toImage(gd, {
              height: 1000,
              width: 1000
            })
            .then(
              function(url) {
                img_jpg.attr("src", url);
                callback(url);
                return Plotly.toImage(gd, {
                  format: 'png',
                  height: 1000,
                  width: 1000
                });
              }
            )
        })

    ;

  });

}

function reBuildImage() {
  var relon = $('#vertical-long').val();
  var relat = $('#vertical-lat').val();
  var reheight = $("input[name='vhRadios']:checked").val();
  $("#longImage").attr("href", airView.buildImagePath("lon", relon));
  $("#latImage").attr("href", airView.buildImagePath("lat", relat));
  $("#horiImage").attr("href", airView.buildImagePath("h", reheight));
}
