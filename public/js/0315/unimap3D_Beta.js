// version:1.0        author:sunzq        Email:zengqiang365@163.com
/*********************************************************************
 * 地图初始化选项
 *********************************************************************/

//本地地图服务
var satelliteTMS = new Cesium.UrlTemplateImageryProvider({
    url: '/maps/googlesatellite/{z}/{x}/{y}.png',
    maximumLevel: 7
});
//初始化并设置视图
var viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,//是否创建动画小器件，左下角仪表
    timeline: false,//是否显示时间轴
    vrButton: false,//是否显示VR按钮
    fullscreenButton: false,//是否显示全屏按钮
    geocoder: false,//是否显示geocoder小器件，右上角查询按钮
    homeButton: false,//是否显示Home按钮
    infoBox: false,//是否显示信息框
    sceneModePicker: true,//是否显示3D/2D选择器
    selectionIndicator: false,//是否显示选取指示器组件
    navigationHelpButton: false,//是否显示右上角的帮助按钮
    baseLayerPicker: false,//是否显示图层选择器
    imageryProvider: satelliteTMS,//图像图层提供者，仅baseLayerPicker设为false有意义
    terrainExaggeration: 40,
    fullscreenElement: document.body,//全屏时渲染的HTML元素,  
    useDefaultRenderLoop: true,//如果需要控制渲染循环，则设为true  
    targetFrameRate: undefined,//使用默认render loop时的帧率  
    showRenderLoopErrors: false,//如果设为true，将在一个HTML面板中显示错误信息  
    automaticallyTrackDataSourceClocks: true,//自动追踪最近添加的数据源的时钟设置  
    contextOptions: undefined,//传递给Scene对象的上下文参数（scene.options）  
    sceneMode: Cesium.SceneMode.SCENE3D,//初始场景模式  
    mapProjection: new Cesium.WebMercatorProjection(),//2D时地图投影体系  
    dataSources: new Cesium.DataSourceCollection()//需要进行可视化的数据源的集合  
});

//高程数据源配置
// var cesiumTerrainProviderMeshes = new Cesium.VRTheWorldTerrainProvider({
//     url: 'http://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/',
//     credit: 'Terrain data courtesy VT MÄK'
// });

//var cesiumTerrainProviderMeshes = new Cesium.EllipsoidTerrainProvider()
var cesiumTerrainProviderMeshes = new Cesium.CesiumTerrainProvider({
    url: '/maps/terrain_tiles/'
});

viewer.terrainProvider = cesiumTerrainProviderMeshes;
//去除版权信息
viewer._cesiumWidget._creditContainer.style.display = "none";

//设置视角，将视角设置到中国，10000km高度
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(119, 40, 10000000.0)
});
//视图切换时的动画效果
viewer.scene.morphComplete.addEventListener(function () {
    setTimeout(function () {
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(110, 35, 10000000.0)
        });
    }, 500)
})

//设置不同地图的集合
var imageryLayers = viewer.imageryLayers;
satelliteLayer = new Cesium.ImageryLayer(satelliteTMS);
satelliteLayer.name = "谷歌卫星+地形";

var streetTMS = new Cesium.UrlTemplateImageryProvider({
    url: '/maps/googlestreet/{z}/{x}/{y}.png',
    maximumLevel: 7
});
streetLayer = new Cesium.ImageryLayer(streetTMS);
streetLayer.name = "地图";

/*********************************************************************
 * 页面基本初始化
 ********************************************************************/
//配置存储，根据配置请求数据
var configuration = {
    overlayType: "pm2_5",
    dataServerAddr: "http://localhost:4002",
    imageServerAddr: "http://10.192.25.154:4002/?",
    time: moment.utc("2017-02-25 23:00:00")
}

//加载位置信息（经/纬/高度）
var positionGrid = new Array(15);//高度 15*[194*194]
var latGrid = new Array();//纬度 [194*194]
var longGrid = new Array();//经度 [194*194]
var vertical_lonGrid;//经度数组 [194][194]
var vertical_latGrid;//纬度数组 [194][194]
//页面控件
var longslider, longEntity;
var latslider, latEntity;

//加载基础网格数据
function buildGrid() {
    for (var k = 0; k < 15; k++) {
        var url = "/data/gmp/gmp-level" + k + ".json";
        (function (a, b) {
            Cesium.loadJson(a).then(function (jsonData) {
                positionGrid[b] = jsonData[0].data;
            }).otherwise(function (error) {
            });
        })(url, k);
    }
    Cesium.loadJson("/data/coordinate/lat.json").then(function (jsonData) {
        latGrid = jsonData.XLAT;
        vertical_latGrid = _.chunk(latGrid, 194);
        buildVlatSlider();
    }).otherwise(function (error) {
    });
    Cesium.loadJson("/data/coordinate/long.json").then(function (jsonData) {
        longGrid = jsonData.XLONG;
        vertical_lonGrid = _.chunk(longGrid, 194);
        buildVlonSlider();
    }).otherwise(function (error) {
    });
}

//根据配置设置读取图片的地址
function buildImagePath(vtype, num) {
    var href = configuration.imageServerAddr +
        "overlay=" + configuration.overlayType +
        "&verticaltype=" + vtype +
        "&time=" + configuration.time.format("YYYY-MM-DD_HH") +
        "&num=" + num;
    return href;
}

function reBuildImage() {
    var relon = $('#vertical-long').val();
    var relat = $('#vertical-lat').val();
    var reheight = $("input[name='vhRadios']:checked").val();
    $("#longImage").attr("href", buildImagePath("lon", relon));
    $("#latImage").attr("href", buildImagePath("lat", relat));
    $("#horiImage").attr("href", buildImagePath("h", reheight));
}
//根据网格数据设置垂直剖面的位置
function buildVlonSlider() {
    longslider = $("#vertical-long").slider({
        tooltip: 'always',
        tooltip_position: 'bottom',
    });
    var initLonNum = $('#vertical-long').val();
    longEntity = viewer.entities.add({
        show: false,
        name: 'vertical-long',
        wall: {
            positions: Cesium.Cartesian3.fromDegreesArray([vertical_lonGrid[0][initLonNum], 10, vertical_lonGrid[193][initLonNum], 53]),
            maximumHeights: [200000, 200000],
            minimumHeights: [0, 0],
            material: Cesium.Color.fromAlpha(Cesium.Color.DEEPSKYBLUE, 0.7)
        }
    });
    longslider.on("slideStop", function (event) {
        initLonNum = $('#vertical-long').val();
        longEntity.wall.positions = Cesium.Cartesian3.fromDegreesArray([vertical_lonGrid[0][initLonNum], 10, vertical_lonGrid[193][initLonNum], 53]);
        $("#longImage").attr("href", buildImagePath("lon", initLonNum));
    });
}
function buildVlatSlider() {
    latslider = $("#vertical-lat").slider({
        tooltip: 'always',
        tooltip_position: 'bottom',
    });
    var initLatNum = $('#vertical-lat').val();
    latEntity = viewer.entities.add({
        show: false,
        name: 'vertical-lat',
        wall: {
            positions: Cesium.Cartesian3.fromDegreesArray([73, vertical_latGrid[initLatNum][0], 135, vertical_latGrid[initLatNum][0]]),
            maximumHeights: [200000, 200000],
            minimumHeights: [0, 0],
            material: Cesium.Color.fromAlpha(Cesium.Color.DEEPSKYBLUE, 0.7)
        }
    });
    latslider.on("slideStop", function (event) {
        initLatNum = $('#vertical-lat').val();
        latEntity.wall.positions = Cesium.Cartesian3.fromDegreesArray([73, vertical_latGrid[initLatNum][0], 135, vertical_latGrid[initLatNum][0]]);
        $("#latImage").attr("href", buildImagePath("lat", initLatNum));
    });
}
$("[name=vhRadios]").on('click', function () {
    var height = this.value;
    $("#horiImage").attr("href", buildImagePath("h", height));
})

//绑定地图的change事件，当选择不同的地图时调用 SelectChange()方法
var realHeight = true;
$("#selectMap").change(function () {
    changeMap();
});
function changeMap() {
    //获取下拉框选中项的index属性值
    var selectIndex = $("#selectMap").get(0).selectedIndex;
    if (selectIndex == 1) {
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        imageryLayers.remove(satelliteLayer, false);
        imageryLayers.add(streetLayer);
        realHeight = false;
    } else {
        viewer.terrainProvider = cesiumTerrainProviderMeshes;
        imageryLayers.remove(streetLayer, false);
        imageryLayers.add(satelliteLayer);
        realHeight = true;
    }
    reloadData();
}
//设置垂直剖面图的展示
var chartArray = [
    { id: "#chart1", imageID: "horiImage", name: "水平剖面图", vtype: "h", initNum: "100m" },
    { id: "#chart2", imageID: "longImage", name: "经向垂直剖面图", vtype: "lon", initNum: "119" },
    { id: "#chart3", imageID: "latImage", name: "纬向垂直剖面图", vtype: "lat", initNum: "100" }];
function initProfile() {
    var margin = { top: 19.5, right: 19.5, bottom: 19.5, left: 19.5 },
        width = 850 - margin.right,
        height = 500 - margin.bottom;

    chartArray.forEach(function (chart) {
        // Create the SVG container and set the origin.
        var svg1 = d3.select(chart.id).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        var label = svg1.append("text")
            .attr("class", "year label")
            .attr("y", margin.top * 2)
            .attr("x", margin.left)
            .text(chart.name);

        var svg2 = svg1
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top * 3 + ")");


        svg2.append("image")
            .attr("id", chart.imageID)
            .attr("xlink:href", buildImagePath(chart.vtype, chart.initNum))
            .attr("x", "0")
            .attr("y", "0")
            .attr("height", "100%")
            .attr("width", "100%");

        d3.selectAll('.profile')
            .style({ opacity: '0.8', filter: "alpha(opacity=80)", "-moz-opacity": "0.8", "-khtml-opacity": "0.8" })
            .on('mouseover', function (d) {
                d3.selectAll('.profile').style({ opacity: '0.05', filter: "alpha(opacity=5)", "-moz-opacity": "0.05", "-khtml-opacity": "0.05" });
                d3.select(this).style({ opacity: '1.0', filter: "alpha(opacity=100)", "-moz-opacity": "1.0", "-khtml-opacity": "1.0" });
            })
            .on('mouseout', function (d) {
                d3.selectAll('.profile').style({ opacity: '0.8', filter: "alpha(opacity=80)", "-moz-opacity": "0.8", "-khtml-opacity": "0.8" })
            })
    })
}
initProfile();

//筛选器
var filterArray = ["#lat", "#long", "#height", "#ansi"];
//创建筛选器
function buildFilters(farray) {
    farray.forEach(function (val, index, arr) {
        var tmpslider = $(val).slider({
            tooltip: 'always',
            tooltip_position: 'bottom',
        });
        tmpslider.on("slide slideStop", function (event) {
            setShowRange();
        });
    })
}
buildFilters(filterArray);

//切换数据滤镜和垂直剖面图的标签
$(".tab-btn").click(function () {
    $(".tab-btn").removeClass("btn-primary");
    $(this).addClass("btn-primary");
    var tabName = $("input[name='taboptions']:checked").attr('id');
    if (tabName == "vertical") {
        $("#form-filter").attr('style', "display:block");
        $("#form-vertical").attr('style', "display:none");
        $("#charts").attr('style', "display:none");
        latEntity.show = false;
        longEntity.show = false;
    } else {
        $("#form-filter").attr('style', "display:none");
        $("#form-vertical").attr('style', "display:block");
        $("#charts").attr('style', "display:block");
        latEntity.show = true;
        longEntity.show = true;
    }
});

//时间导航
function setDate(hours) {
    configuration.time.add(hours, 'h');

    reloadData();
    reBuildImage();
}
$("#nav-forward").click(function (event) {
    event.preventDefault();
    setDate(1)
})
$("#nav-forward-more").on("click", function (event) {
    event.preventDefault();
    setDate(24)
});
$("#nav-backward").on("click", function (event) {
    event.preventDefault();
    setDate(-1)
});
$("#nav-backward-more").on("click", function (event) {
    event.preventDefault();
    setDate(-24)
});

/************************************************************************
 *渲染初始化
*************************************************************************/
//创建图层
var overlay = products.productsFor(configuration);

//在canvas中绘制色板
function renderColorScale(colorScale, colorCanvas, mapRange) {
    var width = colorCanvas.width, height = colorCanvas.height;
    var context = colorCanvas.getContext("2d"), n = width - 1;
    //清除原有的颜色
    context.clearRect(0, 0, width, height);
    //[0, 1]之间的p值, 对应 [low, high]的值.
    function spread(p, low, high) {
        return p * (high - low) + low;
    }

    var min, max;
    if (mapRange) {
        min = mapRange.min;
        max = mapRange.max;
    } else {
        min = 0;
        max = 1;
    }
    //画图着色
    for (var i = 0; i <= n; i++) {
        var num = spread((i / n), min, max);
        var color = d3.rgb(colorScale(num));//D3V3的函数，V4中有改变
        context.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
        context.fillRect(i, 0, 1, height);
    }
}

function recolor() {
    var pixColorScale = getPixColorScale();
    viewer.dataSources._dataSources.forEach(function (sourcs) {
        var entities = sourcs.entities;
        entities.values.forEach(function (pix) {
            pix.box.material.color = pixColorScale(pix.value.value);
        })
    });
}
//初始化色度板
function initColorBar() {
    //获取色板信息，并绑定到下拉菜单
    var colors = colortable.getColors();
    colors.unshift("标准");
    d3.select("#colorArray").selectAll("option")
        .data(colors).enter()
        .append("option").text(function (d) { return d });
    //在色板元素上创建canvas
    var width = d3.select('#colorbar').node().offsetWidth;
    var colorBar = d3.select('#colorbar').append('canvas').attr("width", width).attr("height", 20);

    function getColorScale() {
        var col = colortable.getColorScale($("#colorArray option:selected").val());
        return col ? col : overlay.colorScale;
    }
    function getColorRange() {
        var col = colortable.getColorScale($("#colorArray option:selected").val());
        return col ? { min: 0, max: 1 } : overlay.valueRange;
    }
    //绘制颜色比例尺
    renderColorScale(getColorScale(), colorBar.node(), getColorRange());

    $("#colorArray").change(function () {
        renderColorScale(getColorScale(), colorBar.node(), getColorRange());
        recolor();
    });
}
initColorBar();

//创建不同高度的dataSource
function buildLevels(num) {
    for (var i = 0; i < num; i++) {
        var levelName = "level-" + i;
        var tmpDataSource = new Cesium.CustomDataSource(levelName);
        viewer.dataSources.add(tmpDataSource);
    }
}
buildLevels(overlay.levelNum);

/*****************************************************************
 * 渲染过程
 *****************************************************************/
//由名称找到高度的datasource
function findSource(level) {
    var source;
    var levelName = "level-" + level;
    viewer.dataSources._dataSources.forEach(function (s) {
        if (levelName == s.name) {
            source = s;
        }
    });
    return source;
}
//由层数找到高度
function findHeight(level) {
    return level * 50000;
}

/*需要修改为污染物*/
//选择不同高度时显示不同datasource
$("[name=pollutRadios]").on('click', function () {
    var layer = this.value;
    configuration.overlayType = layer;
    overlay = products.productsFor(configuration);
    var range = overlay.valueRange;
    $("#ansi").slider('destroy');
    $("#ansi").slider({
        min: range.min,
        max: range.max,
        step: range.step,
        value: range.value,
        tooltip: 'always',
        tooltip_position: 'bottom'
    });
    $("#ansi").on("slide", function (slideEvt) {
        setShowRange();
    });
    reloadData();
    reBuildImage();
})
//由筛选条件显示格点
function setShowRange() {
    var latRange = $('#lat').val().split(",");
    var lonRange = $('#long').val().split(",");
    var heightRange = $('#height').val().split(",");
    var heightRange = [parseInt(heightRange[0]), parseInt(heightRange[1])];
    var valRange = $('#ansi').val().split(",");
    var layerName = $("input[name='pollutRadios']:checked").attr('value');
    if (layerName == "temp") {
        valRange = [parseFloat(valRange[0]) + 273.15, parseFloat(valRange[1]) + 273.15];
    }

    viewer.dataSources._dataSources.forEach(function (sourcs) {
        var level = parseInt(sourcs.name.split("-")[1]) + 1;
        if (level >= heightRange[0] && level <= heightRange[1]) {
            sourcs.show = true;
            var entities = sourcs.entities;
            entities.suspendEvents();
            var billboardsList = entities.values;
            billboardsList.forEach(function (val, index, arr) {
                var lat = val.value.lat;
                var lon = val.value.lon;
                var value = val.value.value;
                //console.log(value);
                var shouldShow = true;
                if (lat <= latRange[0] || lat >= latRange[1]) {
                    shouldShow = false;
                }
                if (lon <= lonRange[0] || lon >= lonRange[1]) {
                    shouldShow = false;
                }
                if (value <= valRange[0] || value >= valRange[1]) {
                    shouldShow = false;
                }
                if (shouldShow) {
                    val.show = true;
                } else {
                    val.show = false;
                }
            })
            entities.resumeEvents();
        } else {
            sourcs.show = false;
        }
    });
};

function getPixColorScale() {
    var col = colortable.getColorScale($("#colorArray option:selected").val());
    if (col) {
        var low = overlay.valueRange.min, high = overlay.valueRange.max;
        return function (num) {
            var colorStr = col((num - low) / (high - low));
            var rgbcolor = new Cesium.Color.fromCssColorString(colorStr);
            var alpha = overlay.alphaScale(num);
            var rgbacolor = new Cesium.Color.fromAlpha(rgbcolor, alpha);
            return rgbacolor;
        }
    } else {
        return function (num) {
            return overlay.color(num)
        }
    }
}

//将数据加载到地图上(真实)
function load(builder, level) {
    var height = findHeight(level);
    var entities = (findSource(level)).entities;
    var layerName = overlay.type;
    var minValue = overlay.valueRange.min;

    var pixColorScale = getPixColorScale();

    for (var i = 0; i < builder.data.length; i++) {
        var tvalue = builder.data[i];
        if (tvalue >= minValue) {
            if (realHeight) {
                height = positionGrid[level][i] * 100;
            }
            var latitude = latGrid[i];
            var longitude = longGrid[i];
            var a = entities.add({
                value: { value: tvalue, lon: longitude, lat: latitude },
                name: '',
                position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
                box: {
                    dimensions: new Cesium.Cartesian3(27000 - 1000, 27000, 27000.0),
                    material: pixColorScale(tvalue)
                }
            });
        }
    }
}

//随纬度变化时，1经度之间的距离
function distance(lat) {
    return 111700 * Math.cos(lat / 180 * Math.PI);
}

function getPath(mytime) {
    return mytime.utc().format("YYYY-MM-DD_HH") + "-";
}
//根据选择的图层加载数据
var loadData = function () {
    var urls = overlay.paths();
    urls.forEach(function (url, index) {
        (function (a, b) {
            var polluteTime = getPath(configuration.time);
            var geturl = "/data/pollute/2015052506/" + polluteTime + a;
            //var geturl = "/data/current-" + a;
            Cesium.loadJson(geturl).then(function (jsonData) {
                load(overlay.data(jsonData), b);
            }).otherwise(function (error) {
            });
        })(url, index);
    })
    $("#timeLabel").html(configuration.time.utc().format("YYYY-MM-DD HH:mm:ss") + " UTC");
    $("#verContentLable").html(configuration.time.utc().format("YYYY-MM-DD HH:mm:ss") + " UTC " + configuration.overlayType);
}

//重新加载数据
function reloadData() {
    //移除原来的数据源
    viewer.dataSources.removeAll();
    //创建数据源
    buildLevels(overlay.levelNum);
    //加载数据
    loadData();
}

when(true).then(buildGrid).then(loadData);