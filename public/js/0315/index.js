//// version:1.0        author:sunzq        Email:zengqiang365@163.com
//var airView = initViewer('#cesiumContainer', "http://localhost:4002",
var airView = initViewer('#cesiumContainer',
  "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage",
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
      });
      airView.setHeightEntSize();
      var heightNum = $('#vertical-height').val();
      airView.drawHeightImage(chartArray[5].id, chartArray[5].name,
        heightNum, drawHeight);

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
    });

  });
  airView.reloadData();
  reBuildImage();
})

$("[name='pblhcheck']").on('click', function() {
  var checked = $("input[name='pblhcheck']").is(':checked');
  checked ? airView.showPBLH() : airView.hidePBLH();
})

//-------------------时间导航---------------------------------------------------------
var currentTime;

function setTimeBar() {
  var conf = airView.getConfig();
  currentTime = conf.time;
  console.log(conf.time);
  $("#timeLabel").html(conf.time.utc().format("YYYY-MM-DD HH:mm:ss") + " UTC");
  $("#verContentLable").html(conf.time.utc().format("YYYY-MM-DD HH:mm:ss") +
    " UTC" + conf.overlayType);
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
  //colors.unshift("标准");
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
    airView.drawImage(chartArray[3].id, chartArray[3].name, chartArray[3].vtype,
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
    airView.drawImage(chartArray[4].id, chartArray[4].name, chartArray[4].vtype,
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
    //console.log("buildVheightSlider");
    //console.log(currentTime.utc());
    airView.drawHeightImage(chartArray[5].id, chartArray[5].name,
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

function reBuildImage() {
  var relon = $('#vertical-long').val();
  var relat = $('#vertical-lat').val();
  var reheight = $("input[name='vhRadios']:checked").val();
  var heightNum = $('#vertical-height').val();
  airView.drawHeightImage(chartArray[5].id, chartArray[5].name,
    heightNum, drawHeight);
  $("#longImage").attr("href", airView.buildImagePath("lon", relon));
  $("#latImage").attr("href", airView.buildImagePath("lat", relat));
  $("#horiImage").attr("href", airView.buildImagePath("h", reheight));
}
