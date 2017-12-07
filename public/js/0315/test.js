// version:1.0        author:sunzq        Email:zengqiang365@163.com
//////////////////////////////////////////////////////////////////////////////////////
//初始化viewer，option选项{satelliteMapUrl, streetMapUrl, terrainMapUrl}
function initViewer(eleID, dataServer, imageServer, options) {
    //-------------------------设置地图服务-----------------------------------------
    var eleName = eleID.replace("#", "");//如果有#号，则去掉
    var satelliteTMS;//卫星地图服务
    var streetTMS;//街道地图服务
    var terrainTMS;//地形服务
    //判断是否设置了卫星地图服务地址
    if (!("satelliteMapUrl" in options)) {
        satelliteTMS = undefined
    } else {
        satelliteTMS = new Cesium.UrlTemplateImageryProvider({
            url: options.satelliteMapUrl,
            maximumLevel: 7
        });
    }
    //判断是否设置了街道地图服务地址
    if (!("streetMapUrl" in options)) {
        streetTMS = Cesium.createOpenStreetMapImageryProvider({
            url: 'https://a.tile.openstreetmap.org/'
        });
    } else {
        streetTMS = new Cesium.UrlTemplateImageryProvider({
            url: options.streetMapUrl,
            maximumLevel: 7
        });
    }
    //判断是否设置了高程服务地址
    if (!("terrainMapUrl" in options)) {
        terrainTMS = new Cesium.VRTheWorldTerrainProvider({
            url: 'http://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/',
            credit: 'Terrain data courtesy VT MÄK'
        });
    } else {
        terrainTMS = new Cesium.CesiumTerrainProvider({
            url: options.terrainMapUrl
        });
    }
    /*****************************************************************
     * 基本的地图设置
     *****************************************************************/
    //初始化并设置视图
    var viewer = new Cesium.Viewer(eleName, {
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
        useDefaultRenderLoop: true,//如果需要控制渲染循环，则设为true  
        targetFrameRate: undefined,//使用默认render loop时的帧率  
        showRenderLoopErrors: false,//如果设为true，将在一个HTML面板中显示错误信息  
        automaticallyTrackDataSourceClocks: true,//自动追踪最近添加的数据源的时钟设置  
        contextOptions: undefined,//传递给Scene对象的上下文参数（scene.options）  
        sceneMode: Cesium.SceneMode.SCENE3D,//初始场景模式  
        mapProjection: new Cesium.WebMercatorProjection(),//2D时地图投影体系  
        dataSources: new Cesium.DataSourceCollection()//需要进行可视化的数据源的集合  
    });
    viewer.terrainProvider = terrainTMS;
    //去除版权信息
    viewer._cesiumWidget._creditContainer.style.display = "none";
    //设置地图的视角
    function setFocus(lon, lat, height) {
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, height)
        });
        //视图切换时的动画效果
        viewer.scene.morphComplete.addEventListener(function () {
            setTimeout(function () {
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(lon, lat, height)
                });
            }, 500)
        })
    }

    //设置不同地图的集合
    var imageryLayers = viewer.imageryLayers;
    if (satelliteTMS) {
        satelliteLayer = new Cesium.ImageryLayer(satelliteTMS);
    } else {
        satelliteLayer = imageryLayers.get(0);
    }
    satelliteLayer.name = "卫星+地形";

    streetLayer = new Cesium.ImageryLayer(streetTMS);
    streetLayer.name = "地图";

    /*****************************************************************
     * 数据相关
     *****************************************************************/
    //配置存储，根据配置请求数据
    var configuration = {
        overlayType: ("defaultOverlay" in options) ? options.defaultOverlay : "pm2_5",
        dataServerAddr: dataServer,
        imageServerAddr: imageServer,
        color: "标准",
        realHeight: ("realHeight" in options) ? options.realHeight : true,
        time: moment.utc("2017-02-25 23:00:00")
    }
    //获取和设置信息
    function getConfig() {
        return configuration;
    }
    function setOverlay(layerName) {
        configuration.overlayType = layerName;
        overlay = products.productsFor(configuration);
    }
    function getOverlay() {
        return overlay;
    }

    //---------------------------加载位置信息（经/纬/高度）------------------------------
    var positionGrid = new Array(15);//高度 15*[194*194]
    var latGrid = new Array();//纬度 [194*194]
    var longGrid = new Array();//经度 [194*194]
    var vertical_lonGrid;//经度数组 [194][194]
    var vertical_latGrid;//纬度数组 [194][194]

    function buildGrid() {
        var urlArry = new Array();
        for (var k = 0; k < 15; k++) {
            var url = "/data/gmp/gmp-level" + k + ".json";
            urlArry.push(url);
        }
        //加载网格点高度数据
        var loadGmp = Promise.map(urlArry, function (url, index) {
            return Cesium.loadJson(url).then(function (jsonData) {
                positionGrid[index] = jsonData[0].data;
                return positionGrid;
            })
        });
        //加载网格点纬度信息
        var loadLat = Cesium.loadJson("/data/coordinate/lat.json").then(function (jsonData) {
            latGrid = jsonData.XLAT;
            vertical_latGrid = _.chunk(latGrid, 194);
            return vertical_latGrid;
        });
        //加载网格点经度信息
        var loadLon = Cesium.loadJson("/data/coordinate/long.json").then(function (jsonData) {
            longGrid = jsonData.XLONG;
            vertical_lonGrid = _.chunk(longGrid, 194);
            return vertical_lonGrid;
        });

        return Promise.all([loadLat, loadLon, loadGmp]);
    }

    //----------------剖面图的操作--------------------------------------------------
    //剖面图的实体
    var longEntity, latEntity;
    //纬向剖面
    function buildVlat() {
        //初始剖面位置
        var initLatNum = ("defaultLatEnt" in options) ? options.defaultLatEnt : 100;
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
    }
    //经向剖面
    function buildVlon() {
        //初始剖面位置
        var initLonNum = ("defaultLonEnt" in options) ? options.defaultLonEnt : 119;
        //剖面图示意实体
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
    }
    //设置位置
    function setLonEntPosition(nowNum) {
        longEntity.wall.positions = Cesium.Cartesian3.fromDegreesArray([vertical_lonGrid[0][nowNum], 10, vertical_lonGrid[193][nowNum], 53]);
    }
    function setLatEntPosition(nowNum) {
        latEntity.wall.positions = Cesium.Cartesian3.fromDegreesArray([73, vertical_latGrid[nowNum][0], 135, vertical_latGrid[nowNum][0]]);
    }
    //剖面图示意实体的显示设置
    function setVerticalShow() {
        latEntity.show = true;
        longEntity.show = true;
    }
    function setVerticalHide() {
        latEntity.show = false;
        longEntity.show = false;
    }

    /*****************************************************************
     * 渲染过程
     *****************************************************************/
    //显示的Overlay
    var overlay = products.productsFor(configuration);
    //创建不同高度的dataSource
    function buildLevels(num) {
        for (var i = 0; i < num; i++) {
            var levelName = "level-" + i;
            var tmpDataSource = new Cesium.CustomDataSource(levelName);
            viewer.dataSources.add(tmpDataSource);
        }
    }
    //获取污染物的图层
    function getOverlaySources() {
        var sourceArray = new Array();
        viewer.dataSources._dataSources.forEach(function (source) {
            if (source.name.indexOf('level') == 0) {
                sourceArray.push(source);
            }
        });
        return sourceArray;
    }
    //删除污染物图层
    function removeLevels() {
        getOverlaySources().forEach(function (s) {
            viewer.dataSources.remove(s);
        })
    }
    buildLevels(overlay.levelNum);

    //PBLH层数据
    var pblhSource;
    var shouldShowPBLH = false;
    function buildPBLH() {
        pblhSource = new Cesium.CustomDataSource('pblh');
        viewer.dataSources.add(pblhSource);
        pblhSource.show = shouldShowPBLH;
        var polluteTime = getPolluteTime(configuration.time);
        var geturl = configuration.dataServerAddr + "/data/pollute/2015052506/pblh/" + polluteTime + "PBLH.json";
        Cesium.loadJson(geturl).then(function (jsonData) {
            var pblh = jsonData[0].data;
            var entities = pblhSource.entities;
            for (var i = 0; i < pblh.length - 194; i++) {
                // var height = pblh[i] * 100;
                // var latitude = latGrid[i];
                // var longitude = longGrid[i];
                // var a = entities.add({
                //     value: { value: height, lon: longitude, lat: latitude },
                //     name: '',
                //     position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
                //     box: {
                //         dimensions: new Cesium.Cartesian3(27000 - 1000, 27000, 0),
                //         material: Cesium.Color.NAVY.withAlpha(0.2)
                //     }
                // });
                if ((i - 193) % 194 == 0) {
                    continue;
                }
                var height = pblh[i] * 100;
                var latitude1 = latGrid[i], latitude2 = latGrid[i + 195];
                var longitude1 = longGrid[i], longitude2 = longGrid[i + 195];
                var a = entities.add({
                    rectangle: {
                        coordinates: Cesium.Rectangle.fromDegrees(longitude1, latitude1, longitude2, latitude2),
                        height: height,
                        material: Cesium.Color.NAVY.withAlpha(0.2)
                    }
                });
            }
        }).otherwise(function (error) {
            console.log(error);
        });
    }
    function reBuildPBLH() {
        if (shouldShowPBLH) {
            viewer.dataSources.remove(pblhSource);
            buildPBLH();
        }
    }
    function showPBLH() {
        shouldShowPBLH = true;
        buildPBLH();
    }
    function hidePBLH() {
        shouldShowPBLH = false;
        viewer.dataSources.remove(pblhSource);
    }

    //-----------------------------着色相关-----------------------------
    //获取对应的色谱
    function getPixColorScale() {
        var col = colortable.getColorScale(configuration.color);
        //根据不同的值和色谱返回对应的颜色
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
    //在canvas中绘制色板
    function renderColorScale(colorName, colorBar) {
        configuration.color = colorName;
        //获取色谱和边界值
        var col = colortable.getColorScale(colorName);
        var colorScale = col ? col : overlay.colorScale;
        var mapRange = col ? { min: 0, max: 1 } : overlay.valueRange;

        var colorCanvas = colorBar.node();
        var width = colorCanvas.width, height = colorCanvas.height;
        var context = colorCanvas.getContext("2d"), n = width - 1;
        //清除原有的颜色
        context.clearRect(0, 0, width, height);
        //[0, 1]之间的p值, 对应 [low, high]的值.
        function spread(p, low, high) {
            return p * (high - low) + low;
        }

        var min = mapRange.min;
        var max = mapRange.max;
        //画图着色
        for (var i = 0; i <= n; i++) {
            var num = spread((i / n), min, max);
            var color = d3.rgb(colorScale(num));//D3V3的函数，V4中有改变
            context.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
            context.fillRect(i, 0, 1, height);
        }

        function clamp(x, low, high) {
            return Math.max(low, Math.min(x, high));
        }
        //鼠标在上时显示值
        colorBar.on("mousemove", function () {
            var x = d3.mouse(this)[0];
            var pct = clamp((Math.round(x) - 2) / (n - 2), 0, 1);
            var value = spread(pct, overlay.valueRange.min, overlay.valueRange.max).toFixed(2);
            var unit = overlay.units[0].label;
            colorBar.attr("title", value + " " + unit);
        });
    }
    function recolor() {
        var pixColorScale = getPixColorScale();
        getOverlaySources().forEach(function (sourcs) {
            var entities = sourcs.entities;
            entities.values.forEach(function (pix) {
                pix.box.material.color = pixColorScale(pix.value.value);
            })
        });
    }

    //----------------------------体像素渲染----------------------------------
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
    //将数据加载到地图上
    // function load(builder, level) {
    //     var height = findHeight(level);
    //     var entities = (findSource(level)).entities;
    //     var layerName = overlay.type;
    //     var minValue = overlay.valueRange.min;
    //     //获取对应的色谱
    //     var pixColorScale = getPixColorScale();

    //     for (var i = 0; i < builder.data.length; i++) {
    //         var tvalue = builder.data[i];
    //         if (tvalue >= minValue) {
    //             if (configuration.realHeight) {
    //                 height = positionGrid[level][i] * 100;
    //             }
    //             var latitude = latGrid[i];
    //             var longitude = longGrid[i];
    //             var a = entities.add({
    //                 value: { value: tvalue, lon: longitude, lat: latitude },
    //                 name: '',
    //                 position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
    //                 box: {
    //                     dimensions: new Cesium.Cartesian3(27000 - 1000, 27000, 27000.0),
    //                     material: pixColorScale(tvalue)
    //                 }
    //             });
    //         }
    //     }
    // }

    //将数据加载到地图上
    function load(builder, level) {
        var height = 27000 * level;
        var entities = (findSource(level)).entities;
        var minValue = overlay.valueRange.min;
        //获取对应的色谱
        var pixColorScale = getPixColorScale();

        var header = builder.header;
        //确定经纬度范围及点间隔
        var loMin = 100, laMin = Math.min(header.la1, header.la2);  // 网格的起始 (e.g., 0.0E, 90.0N)
        var loMax = Math.max(header.lo1, header.lo2), laMax = Math.max(header.la1, header.la2);
        var dx = header.dx, dy = header.dy;    // 网格点之间的距离 (e.g., 2.5 deg lon, 2.5 deg lat)
        var nx = 194, ny = 194;    // 网格点数 W-E and N-S (e.g., 144 x 73)

        var lon = loMin, lat = laMin;
        for (var i = 0; i < builder.data.length; i++) {
            var tvalue = builder.data[i];
            if (tvalue > minValue) {
                var a = entities.add({
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
                    box: {
                        dimensions: new Cesium.Cartesian3(dx * distance(lat) - 100, dy * 110000.0, 100000.0),
                        material: pixColorScale(tvalue)
                    }
                });
                lon += dx;
                if (lon > loMax) {
                    lat += dy;
                    lon = loMin;
                }

            }
        }
    }

    //随纬度变化时，1经度之间的距离
    function distance(lat) {
        return 111700 * Math.cos(lat / 180 * Math.PI);
    }

    function getPolluteTime(mytime) {
        return mytime.utc().format("YYYY-MM-DD_HH") + "-";
    }
    //根据选择的图层加载数据
    var loadData = function () {
        var urls = overlay.paths();
        urls.forEach(function (url, index) {
            (function (a, b) {
                var polluteTime = getPolluteTime(configuration.time);
                var geturl = configuration.dataServerAddr + "/data/pollute/2015052506/" + polluteTime + a;
                //var geturl = "/data/current-" + a;
                Cesium.loadJson(geturl).then(function (jsonData) {
                    load(overlay.data(jsonData), b);
                }).otherwise(function (error) {
                    console.log(error);
                });
            })(url, index);
        })
    }

    /*****************************************************************
     * 面向控制的接口
     *****************************************************************/
    //重新加载数据
    function reloadData() {
        //移除原来的数据源
        removeLevels();
        //创建数据源
        buildLevels(overlay.levelNum);
        //加载数据
        loadData();
    }
    //设置时间
    function setDate(hours) {
        configuration.time.add(hours, 'h');
        reloadData();
        reBuildPBLH();
    }

    //由筛选条件显示格点
    function setShowRange(ranges) {
        var latRange = ranges.latRange;
        var lonRange = ranges.lonRange;
        var heightRange = ranges.heightRange;
        var valRange = ranges.valRange;
        var layerName = configuration.overlayType;
        if (layerName == "temp") {
            valRange = [parseFloat(valRange[0]) + 273.15, parseFloat(valRange[1]) + 273.15];
        }

        getOverlaySources().forEach(function (sourcs) {
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
                });
                entities.resumeEvents();
            } else {
                sourcs.show = false;
            }
        });
    };

    //切换地图
    function changeMap(mapName) {
        if (mapName == "streetMap") {
            viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            imageryLayers.remove(satelliteLayer, false);
            imageryLayers.add(streetLayer);
            configuration.realHeight = false;
        } else {
            viewer.terrainProvider = terrainTMS;
            imageryLayers.remove(streetLayer, false);
            imageryLayers.add(satelliteLayer);
            configuration.realHeight = true;
        }
        reloadData();
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

    function start() {
        buildGrid().then(function () {
            buildVlat();
            buildVlon();
            loadData();
        })
    }

    return {
        getConfig: getConfig,
        setFocus: setFocus,
        buildImagePath: buildImagePath,
        setLonEntPosition: setLonEntPosition,
        setLatEntPosition: setLatEntPosition,
        changeMap: changeMap,
        getPixColorScale: getPixColorScale,
        reloadData: reloadData,
        setDate: setDate,
        renderColorScale: renderColorScale,
        recolor: recolor,
        setVerticalShow: setVerticalShow,
        setVerticalHide: setVerticalHide,
        setShowRange: setShowRange,
        setOverlay: setOverlay,
        getOverlay: getOverlay,
        showPBLH: showPBLH,
        hidePBLH: hidePBLH,
        start: start
    }
}