//// version:1.0        author:sunzq        Email:zengqiang365@163.com
var airView = initViewer('#cesiumContainer', "http://localhost:4002",
  "http://10.192.25.154:4002/?", {
    satelliteMapUrl: 'http://localhost:4002/maps/satellite/{z}/{x}/{y}.png',
    streetMapUrl: 'http://localhost:4002/maps/street/{z}/{x}/{y}.png',
    terrainMapUrl: 'http://localhost:4002/maps/terrain_tiles/',
    defaultLonEnt: 119,
    defaultLatEnt: 100,
    realHeight: true
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
  $("#verContentLable").html(conf.time.utc().format("YYYY-MM-DD HH:mm:ss") +
    " UTC " + conf.overlayType);

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
var longslider;
var latslider;
//根据网格数据设置垂直剖面的位置
function buildVlonSlider() {
  longslider = $("#vertical-long").slider({
    tooltip: 'always',
    tooltip_position: 'bottom',
  });
  longslider.on("slideStop", function(event) {
    var lonNum = $('#vertical-long').val();
    airView.setLonEntPosition(lonNum);
    $("#longImage").attr("href", airView.buildImagePath("lon", lonNum));
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
    $("#latImage").attr("href", airView.buildImagePath("lat", latNum));
  });
}
buildVlatSlider();
$("[name=vhRadios]").on('click', function() {
    var height = this.value;
    $("#horiImage").attr("href", airView.buildImagePath("h", height));
  })
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

//设置垂直剖面图的展示
var chartArray = [{
  id: "#chart1",
  imageID: "horiImage",
  name: "水平剖面图",
  vtype: "h",
  initNum: "100m"
}, {
  id: "#chart2",
  imageID: "longImage",
  name: "经向垂直剖面图",
  vtype: "lon",
  initNum: "119"
}, {
  id: "#chart3",
  imageID: "latImage",
  name: "纬向垂直剖面图",
  vtype: "lat",
  initNum: "100"
}];

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
    // Create the SVG container and set the origin.
    var svg1 = d3.select(chart.id)
      .style({
        'margin-left': margin_chart * index + "px"
      })
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    var label = svg1.append("text")
      .attr("class", "year label")
      .attr("y", margin.top * 2)
      .attr("x", width / 3)
      .text(chart.name);

    var svg2 = svg1
      .append("g")
      .attr("transform", "translate(" + 0 + "," + margin.top * 3 + ")");

    svg2.append("image")
      .attr("id", chart.imageID)
      .attr("xlink:href", airView.buildImagePath(chart.vtype, chart.initNum))
      .attr("x", "0")
      .attr("y", "0")
      .attr("height", "100%")
      .attr("width", "100%");

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
  $("#longImage").attr("href", airView.buildImagePath("lon", relon));
  $("#latImage").attr("href", airView.buildImagePath("lat", relat));
  $("#horiImage").attr("href", airView.buildImagePath("h", reheight));
}
