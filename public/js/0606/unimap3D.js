// version:1.0        author:sunzq        Email:zengqiang365@163.com
//////////////////////////////////////////////////////////////////////////////////////
//初始化viewer，option选项{satelliteMapUrl, streetMapUrl, terrainMapUrl}
function initViewer(eleID, dataServer, imageServer, options) {
    //-------------------------设置地图服务-----------------------------------------
    d3.select(eleID).style({ "width": window.screen.width+"px", "height": window.screen.height+"px" });
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
        fullscreenButton: true,//是否显示全屏按钮
        geocoder: false,//是否显示geocoder小器件，右上角查询按钮
        homeButton: false,//是否显示Home按钮
        infoBox: true,//是否显示信息框
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
    //禁止显示infobox
    d3.select(".cesium-viewer-infoBoxContainer").style("display", "none");
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50000;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000000;
    viewer.scene.screenSpaceCameraController._minimumZoomRate = 50000;
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
            }, 1000)
        })
    }

    function showlogo() {
        d3.select("body").append("div")
            .style({
                'display': 'block', 'position': "absolute", "bottom": "00px", "right": "0px",
                opacity: '0.05', filter: "alpha(opacity=5)", "-moz-opacity": "0.05", "-khtml-opacity": "0.05",
                height: "20px", width: "50px"
            })
            .append("img")
            .attr("src", "/images/cesium-white-sm.png")
    }
    //showlogo();

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
        time: moment.utc("2017-02-25 23:00:00"),
        mapType: "satelliteMap"
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
    //根据色系的改变，重新绘制颜色
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
    function load(builder, level) {
        var height = findHeight(level);
        var entities = (findSource(level)).entities;
        var layerName = overlay.type;
        var minValue = overlay.valueRange.min;
        //获取对应的色谱
        var pixColorScale = getPixColorScale();

        for (var i = 0; i < builder.data.length; i++) {
            var tvalue = builder.data[i];
            if (tvalue >= minValue) {
                if (configuration.realHeight) {
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
    function useStreetMap() {
        if (configuration.mapType == "streetMap") {
            return;
        }
        configuration.mapType = "streetMap";
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        imageryLayers.remove(satelliteLayer, false);
        imageryLayers.add(streetLayer);
        configuration.realHeight = false;
    }
    function useSatelliteMap() {
        if (configuration.mapType == "satelliteMap") {
            return;
        }
        configuration.mapType = "satelliteMap"
        viewer.terrainProvider = terrainTMS;
        imageryLayers.remove(streetLayer, false);
        imageryLayers.add(satelliteLayer);
        configuration.realHeight = true;
    }
    function changeMap(mapName) {
        if (mapName == "streetMap") {
            useStreetMap();
        } else {
            useSatelliteMap();
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

    /***********************************************************************************
     *                                实时监测数据
     ***********************************************************************************/
    //全国城市和省会城市
    var allCities, cities_capital;
    //两个行政区域信息
    var provinceDataSource;
    //所有站点信息
    var stationDataSource = new Cesium.CustomDataSource("stationList");
    viewer.dataSources.add(stationDataSource);
    stationDataSource.show = false;
    //所有城市信息
    var citiesDataSource = new Cesium.CustomDataSource("allCitiesList");
    viewer.dataSources.add(citiesDataSource);
    citiesDataSource.show = false;
    //省会城市信息
    var capitalCityDataSource = new Cesium.CustomDataSource("capitalCityList");
    viewer.dataSources.add(capitalCityDataSource);
    capitalCityDataSource.show = false;

    //污染数值与颜色对应关系
    var pollutColorScale = d3.scale.linear()
        .domain([0, 50, 100, 200, 300, 400, 500, 1000])
        .range(["#1e90ff", "#00ff00", "#ffff00", "#ff9900", "#ff0000", "#4c1130", "#312129", "#000000"])

    //加载两个行政区域的界限
    function loadProvince() {
        //加载两个省界的数据
        var promise = Cesium.GeoJsonDataSource.load('/data/two_provinces-topo.json');
        promise.then(function (dataSource) {
            provinceDataSource = dataSource;
            viewer.dataSources.add(provinceDataSource);
            //Get the array of entities
            var entities = provinceDataSource.entities.values;
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                entity.name = entity.properties.ID;
                entity.properties["地域"] = "京津冀"
                delete entity.properties["ID"];
                entity.type = "province";
                entity.stationLoded = false;
                //Set the polygon material to our random color.
                entity.polygon.material = Cesium.Color.fromAlpha(Cesium.Color.packedLength, 0.01);
                entity.polygon.outline = false;
            }
        }).otherwise(function (error) {
            window.alert(error);
        });
    }
    loadProvince();
    //加载一个省的所有站点
    function loadStationData(provinceID) {
        var provinceStation;
        if (provinceID == "22") {
            provinceStation = "jjjstation.json";
        } else {
            provinceStation = "nmgstation.json";
        }
        Cesium.loadJson('/data/' + provinceStation).then(function (jsonData) {
            var stations = jsonData.data;
            var entities = stationDataSource.entities;
            var pinBuilder = new Cesium.PinBuilder();
            entities.suspendEvents();
            //将站点信息加载到地图中
            stations.forEach(function (station) {
                var colorStr = pollutColorScale(station.aqi);
                var rgbcolor = new Cesium.Color.fromCssColorString(colorStr);
                entity = entities.getById(station.id);
                if (entity) {
                    _.extend(entity, {
                        value: station,
                        billboard: {
                            color: rgbcolor,
                            image: '/images/square.png',
                            verticalOrigin: Cesium.VerticalOrigin.CENTER
                        }
                    })
                } else {
                    var pin = entities.add({
                        id: station.id,
                        name: station.name,
                        value: station,
                        type: "station",
                        position: Cesium.Cartesian3.fromDegrees(station.longitude, station.latitude),
                        billboard: {
                            color: rgbcolor,
                            image: '/images/square.png',
                            verticalOrigin: Cesium.VerticalOrigin.CENTER
                        }
                    });
                }
            });
            entities.resumeEvents();
        }).otherwise(function (error) {
            window.alert(error);
        });
    }

    //加载城市数据
    function loadCityData() {
        citiesDataSource.entities.removeAll();
        capitalCityDataSource.entities.removeAll();
        //加载所有城市的数据
        Cesium.loadJson('/data/cityspol.json').then(function (jsonData) {
            allCities = jsonData.data;
            var entities = citiesDataSource.entities;
            var pinBuilder = new Cesium.PinBuilder();
            //var csvs = "";
            entities.suspendEvents();
            allCities.forEach(function (city) {
                var colorStr = pollutColorScale(city.aqi);
                var rgbcolor = new Cesium.Color.fromCssColorString(colorStr);
                //csvs+=city.longitude + "," + city.latitude + "," + city.aqi + "\r\n";
                var pin = entities.add({
                    id: city.cityid,
                    name: city.cityname,
                    value: city,
                    type: "city",
                    position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat),
                    billboard: {
                        image: pinBuilder.fromText(city.aqi, rgbcolor, 48).toDataURL(),
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
                    }
                });
            });
            entities.resumeEvents();
            //console.log(csvs);
        }).otherwise(function (error) {
            window.alert(error);
        });

        //加载省会城市数据
        Cesium.loadJson('/data/citypol.json').then(function (jsonData) {
            cities_capital = jsonData.data;
            var entities = capitalCityDataSource.entities;
            var pinBuilder = new Cesium.PinBuilder();
            entities.suspendEvents();
            cities_capital.forEach(function (city) {
                var colorStr = pollutColorScale(city.aqi);
                var rgbcolor = new Cesium.Color.fromCssColorString(colorStr);
                var pin = entities.add({
                    id: city.cityid,
                    name: city.cityname,
                    value: city,
                    type: "city",
                    position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat),
                    billboard: {
                        image: pinBuilder.fromText(city.aqi, rgbcolor, 48).toDataURL(),
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
                    }
                });
            });
            entities.resumeEvents();
        }).otherwise(function (error) {
            window.alert(error);
        });
    }
    //视角所在高度
    var focusHeight;
    var focusHeightListener = function (moveEndPosition) {
        focusHeight = viewer.camera.positionCartographic.height;
        if (focusHeight > 2000000) {
            stationDataSource.show = false;
            citiesDataSource.show = false;
            capitalCityDataSource.show = true;
        } else if (focusHeight > 200000) {
            stationDataSource.show = false;
            citiesDataSource.show = true;
            capitalCityDataSource.show = false;
        } else {
            if (stationDataSource.show == false) {
                loadStationData(focusProvinceID);
                stationDataSource.show = true;
            }
            citiesDataSource.show = false;
            capitalCityDataSource.show = false;
        }
    }

    var selectedProvince;
    var screenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    var figure = createFigure();
    //单击一个entity
    function pickProvince(e) {
        var pickedObjects = viewer.scene.drillPick(e.position);
        //什么也没选中，或者只选中了selector
        if (pickedObjects.length == 0 ||
            pickedObjects.length == 1 && pickedObjects[0].id.type == "selector") {
            if (selectedProvince) {//如果之前有选中某个省
                _.extend(selectedProvince.polygon, {
                    material: Cesium.Color.fromAlpha(Cesium.Color.packedLength, 0.01)
                })
            }
            return;
        }//判断选中了物体的个数
        //只选中了省
        if (pickedObjects.length == 1 && pickedObjects[0].id.type == "province") {//如果只选中省
            if (selectedProvince) {//如果之前有选中某个省，则去掉其颜色
                _.extend(selectedProvince.polygon, {
                    material: Cesium.Color.fromAlpha(Cesium.Color.packedLength, 0.01)
                })
            }
            if (Cesium.defined(pickedObjects[0])) {
                selectedProvince = pickedObjects[0].id;
                //将选中的省设为不同的颜色
                _.extend(selectedProvince.polygon, {
                    material: Cesium.Color.fromAlpha(Cesium.Color.MEDIUMSPRINGGREEN, 0.3)
                });
                if (!selectedProvince.stationLoded) {
                    var provinceStation;
                    if (selectedProvince.name == "22") {
                        provinceStation = "jjjstation.json";
                    } else {
                        provinceStation = "nmgstation.json";
                    }
                    var aqiAny = { "优": 0, "良": 0, "轻度": 0, "中度": 0, "重度": 0, "严重": 0 };
                    Cesium.loadJson('/data/' + provinceStation).then(function (jsonData) {
                        var stations = jsonData.data;
                        stations.forEach(function (station) {
                            if (station.aqi <= 50) {
                                aqiAny["优"]++;
                            } else if (station.aqi <= 100) {
                                aqiAny["良"]++;
                            } else if (station.aqi <= 200) {
                                aqiAny["轻度"]++;
                            } else if (station.aqi <= 300) {
                                aqiAny["中度"]++;
                            } else if (station.aqi <= 500) {
                                aqiAny["重度"]++;
                            } else {
                                aqiAny["严重"]++;
                            }
                        });
                    }).then(function () {
                        figure.updateALFigure(aqiAny);
                    });
                }
            }
        } else {
            var entity;
            if (pickedObjects.length == 1) {
                entity = pickedObjects[0].id;
            } else {
                for (var i = 0; i < pickedObjects.length; i++) {
                    if (pickedObjects[i].id.type != "province" && pickedObjects[i].id.type != "selector") {
                        entity = pickedObjects[i].id;
                        break;
                    }
                }
            }//从中取出非省的entity
            if (!entity) { return; }

            entity.description = {
                getValue: function () {
                    return updateInfoBox(entity);
                }
            };
            viewer.selectedEntity = entity;//infobox中显示信息
            //如果选中的是站点
            if (entity.type == "station") {
                Cesium.loadJson("/data/24h/" + entity.value.id + ".json").then(function (jsonData) {
                    var data = jsonData.data;
                    figure.updateSTFigure(data);
                })
            }
        }
    }
    //隐藏省的实体
    function hideProvince() {
        selectedProvince = null;
        provinceDataSource.entities.values.forEach(function (prov) {
            _.extend(prov.polygon, {
                material: Cesium.Color.fromAlpha(Cesium.Color.packedLength, 0.01)
            })
        })
    }
    //更新infobox中的信息
    function updateInfoBox(entity) {
        var props = entity.value;
        var viewValue = {
            ID: props.id,
            "名称": props.name,
            AQI: props.aqi,
            "污染等级": props.airqualitylevel,
            "主要污染物": props.primarypollutant,
            "PM2.5": props.pm25,
            PM10: props.pm10,
            SO2: props.so2,
            NO2: props.no2,
            CO: props.co,
            O3: props.o3
        }
        if (entity.type != "city") {
            viewValue["名称"] = props.sitename;
        }
        var text = '<table class="cesium-infoBox-defaultTable"><tbody>';
        for (var key in viewValue) {
            text += '<tr><th>' + key + '</th><td>' + viewValue[key] + '</td></tr>'
        }
        text += '</tbody></table>';
        return text;
    }

    var focusProvinceID;
    function findProvinceStation(movement) {
        var pickedObject = viewer.scene.pick(movement.endPosition);
        if (Cesium.defined(pickedObject)) {//判断是否经过了一个物体
            if (pickedObject.id.type == "province") {//确定此物体是否是省entity
                if (pickedObject.id.name != focusProvinceID) {//判断此省是否已经关注
                    focusProvinceID = pickedObject.id.name;
                    if (focusHeight < 200000) {
                        loadStationData(focusProvinceID);//加载这个省的站点信息
                    }
                    //console.log(focusProvinceID);
                }
            }
        }
    }
    //创建图形区域
    function createFigure() {
        var margin = { top: 10, right: 30, bottom: 40, left: 55 };
        var width = 400 - margin.left - margin.right;
        var height = 300 - margin.top - margin.bottom;
        var figureType = null;
        //定义颜色
        var colors = {
            "PM2.5": d3.rgb(0, 0, 255),
            "PM10": d3.rgb(120, 63, 4),
            "SO2": d3.rgb(255, 0, 51),
            "NO2": d3.rgb(51, 153, 0),
            "CO": d3.rgb(51, 0, 102),
            "O3": d3.rgb(255, 153, 0)
        }
        var pollutes = ["PM2.5", "PM10", "SO2", "NO2", "CO", "O3"];

        //定义svg画布，所有的图形元素以此svg画布为基础
        var svg = d3.select("#histogram")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            //.style("background","#d9d2e9")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        //污染物曲线
        var polluteSvg = svg.append('g');
        //添加一个g用于放x轴  
        var xAxis = svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")");
        //添加一个g用于放y轴
        var yAxis = svg.append("g")
            .attr("class", "y axis");

        //污染物图例文字
        var polluteTextSVG = svg.append('g').attr("id", "polltext");

        //X坐标轴说明文字
        var xText = svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("x", margin.left)
            .attr("y", height + margin.bottom - 5);
        //y坐标轴说明文字
        var yText = svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("y", -margin.left + 10)
            .attr("x", -height / 3)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)");

        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function (d) {
                return "<strong>数量:</strong> <span style='color:red'>" + d.num + "</span>";
            })
        svg.call(tip);

        function updateSTFigure(data) {
            figureShow();
            if (figureType != "stationTrend") {
                figureType = "stationTrend";
                clearFigure();
                xText.text("过去24小时");
                yText.text("IAQI");
                polluteTextSVG.selectAll(".polluteText")
                    .data(pollutes)
                    .enter()
                    .append('text')
                    .attr('class', "polluteText")
                    .attr("text-anchor", "end")
                    .attr("x", function (d, i) {
                        return margin.left + 40 + i * 35;
                    })
                    .attr("y", height + margin.bottom - 5)
                    .attr('fill', function (d) {
                        return colors[d].toString()
                    })
                    .text(function (d) {
                        return d
                    });
            }
            //创建x轴尺度
            var xScale = d3.time.scale()
                .domain(_.map(d3.extent(_.pluck(data, "time")), function (d) { return new Date(d) }))
                .range([0, width]);
            //创建x轴
            var xAxis = d3.svg.axis()
                .scale(xScale)//线性尺度x
                .ticks(7)//ticks定义了坐标轴上除最小值和最大值以外最多有多少个刻度
                .orient("bottom");
            //绑定x轴
            svg.select(".x.axis")
                .transition()
                .duration(100)
                .ease("linear")
                .call(xAxis);

            var yMax = _.max([_.max(_.pluck(data, "pm25")), _.max(_.pluck(data, "pm10")), _.max(_.pluck(data, "o3"))]) * 1.1;
            //创建y轴尺度
            var yScale = d3.scale.linear().domain([0, yMax]).range([height, 0]);
            //创建y轴
            var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left");
            //绑定y轴
            svg.select(".y.axis")
                .transition()
                .duration(500)
                .ease("linear")
                .call(yAxis);

            //数据
            var pickData = [
                {
                    name: "PM2.5",
                    pdata: _.map(data, function (d) { return [d.time, d.pm25] })
                }, {
                    name: "PM10",
                    pdata: _.map(data, function (d) { return [d.time, d.pm10] })
                }, {
                    name: "SO2",
                    pdata: _.map(data, function (d) { return [d.time, d.so2] })
                }, {
                    name: "NO2",
                    pdata: _.map(data, function (d) { return [d.time, d.no2] })
                }, {
                    name: "CO",
                    pdata: _.map(data, function (d) { return [d.time, d.co] })
                }, {
                    name: "O3",
                    pdata: _.map(data, function (d) { return [d.time, d.o3] })
                }
            ];
            //创建一个直线生成器
            var linePath = d3.svg.line()
                .x(function (d) {
                    return xScale(new Date(d[0]));
                })
                .y(function (d) {
                    return yScale(d[1]);
                })
                .interpolate("basis");//插值模式  

            var lineUpdate = polluteSvg.selectAll("path").data(pickData, function (d) { return d.name });
            var lineEnter = lineUpdate.enter();

            lineEnter.append("path")
                .attr("d", "M0," + height + " H" + width)
                .attr("fill", "none")
                .attr("stroke-width", 3)
                .attr("stroke", function (d) {
                    return colors[d.name];
                })
                .attr("name", function (d) {
                    return d.name;
                })
                .transition()
                .duration(1000)
                .ease("linear")
                .attr("d", function (d) {
                    return linePath(d.pdata);
                });
            lineUpdate.transition()
                .duration(1000)
                .ease("linear")
                .attr("d", function (d) {
                    return linePath(d.pdata);
                });
        }

        function updateALFigure(data) {
            figureShow();
            var xScale = d3.scale.ordinal()
                .domain(["优", "良", "轻度", "中度", "重度", "严重"])
                .rangeBands([0, width], .1);
            if (figureType != "analysis") {
                figureType = "analysis";
                clearFigure();
                //创建x轴
                var xAxis = d3.svg.axis()
                    .scale(xScale)//线性尺度x
                    .orient("bottom");
                //绑定x轴
                svg.select(".x.axis")
                    .call(xAxis);
                xText.text("污染等级");
                yText.text("数量");
            }

            var yMax = d3.max([data['优'], data['良'], data['轻度'], data['中度'], data['重度'], data['严重']]) * 1.2;
            var yScale = d3.scale.linear().domain([0, yMax]).range([height, 0]);
            var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left");
            //绑定y轴
            svg.select(".y.axis")
                .transition()
                .duration(100)
                .ease("linear")
                .call(yAxis);

            var dataArray = new Array();
            for (var key in data) {
                dataArray.push({ level: key, num: data[key] });
            }

            var rectUpdate = polluteSvg.selectAll(".bar").data(dataArray);
            var rectEnter = rectUpdate.enter();

            rectEnter.append("rect")
                .attr("class", "bar")
                .attr("x", function (d) { return xScale(d.level); })
                .attr("width", xScale.rangeBand())
                .attr("y", height)
                .attr("height", 0)
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .transition().duration(300).ease("linear")
                .attr("y", function (d) { return yScale(d.num); })
                .attr("height", function (d) { return height - yScale(d.num); })

            rectUpdate.transition().duration(300).ease("linear")
                .attr("y", function (d) { return yScale(d.num); })
                .attr("height", function (d) { return height - yScale(d.num); });
        }

        function clearFigure() {
            polluteTextSVG.selectAll(".polluteText").remove();
            polluteSvg.selectAll("path").remove();
            polluteSvg.selectAll("rect").remove();
        }
        function figureShow() {
            svg.attr('style', "display:block");
        }
        function hide() {
            svg.attr('style', "display:none");
        }
        return {
            updateSTFigure: updateSTFigure,
            updateALFigure: updateALFigure,
            clearFigure: clearFigure,
            figureShow: figureShow,
            hide: hide
        }
    }

    //aqi统计
    function aqiStatistics(objs) {
        var result = { "优": 0, "良": 0, "轻度": 0, "中度": 0, "重度": 0, "严重": 0 };
        objs.forEach(function (obj) {
            if (obj.value.aqi <= 50) {
                result["优"]++;
            } else if (obj.value.aqi <= 100) {
                result["良"]++;
            } else if (obj.value.aqi <= 200) {
                result["轻度"]++;
            } else if (obj.value.aqi <= 300) {
                result["中度"]++;
            } else if (obj.value.aqi <= 500) {
                result["重度"]++;
            } else {
                result["严重"]++;
            }
        });
        return result;
    }

    var selector;
    //鼠标画出的矩形
    var rectangleCoordinates = new Cesium.Rectangle();
    //笛卡尔坐标
    var cartesian = new Cesium.Cartesian3();
    //(longitude, latitude, height)以弧度/米表示
    var scratchCartographic = new Cesium.Cartographic();
    var center = new Cesium.Cartographic();
    var firstPoint = new Cesium.Cartographic();
    var firstPointSet = false;//是否选取点的标志
    var mouseDown = false;//单击点下标志

    //选取覆盖区域的城市
    function findSpatialCover(range) {
        var entityArray = new Array();
        citiesDataSource.entities.values.forEach(function (entity) {
            var position = Cesium.Cartographic.fromCartesian(entity.position._value);
            var lat = position.latitude, lon = position.longitude;
            if (lon <= range.east && lon >= range.west && lat >= range.south && lat <= range.north) {
                entityArray.push(entity);
            }
        });
        return entityArray;
    }
    //开始画区
    var startClickShift = function () {
        mouseDown = true;
        viewer.scene.screenSpaceCameraController.enableInputs = false;//停止鼠标拖拽的时候镜头的滚动
    }
    //结束画区
    var endClickShift = function () {
        mouseDown = false;
        firstPointSet = false;
        viewer.scene.screenSpaceCameraController.enableInputs = true;
    };
    //画矩形
    var drawSelector = function (movement) {
        if (!mouseDown) {
            return;
        }
        //获取鼠标停止位置的坐标（x,y,z）
        cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
        if (cartesian) {
            //由(x,y,z)转换为（longitude,latitude,height）
            scratchCartographic = Cesium.Cartographic.fromCartesian(cartesian, Cesium.Ellipsoid.WGS84);

            if (!firstPointSet) {
                //赋值起始点
                Cesium.Cartographic.clone(scratchCartographic, firstPoint);
                firstPointSet = true;
            }
            else {
                rectangleCoordinates.east = Math.max(scratchCartographic.longitude, firstPoint.longitude);
                rectangleCoordinates.west = Math.min(scratchCartographic.longitude, firstPoint.longitude);
                rectangleCoordinates.north = Math.max(scratchCartographic.latitude, firstPoint.latitude);
                rectangleCoordinates.south = Math.min(scratchCartographic.latitude, firstPoint.latitude);

                //在矩形大小为0时不进行绘制，否则Cesium会抛出错误
                selector.show = rectangleCoordinates.east !== rectangleCoordinates.west || rectangleCoordinates.north !== rectangleCoordinates.south;
                var selectors = findSpatialCover(rectangleCoordinates);
                var result = aqiStatistics(selectors);
                figure.updateALFigure(result);
            }
        }
    }

    //异步属性加载
    var getSelectorLocation = new Cesium.CallbackProperty(function () {
        return rectangleCoordinates;
    }, false);
    var selectorRectangle = {
        coordinates: getSelectorLocation,
        height: 500,
        material: Cesium.Color.fromAlpha(Cesium.Color.DARKVIOLET, 0.2),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3
    };
    selector = viewer.entities.add({
        type: "selector",
        selectable: false,
        show: false,
        rectangle: selectorRectangle
    });
    //变更不同的监测图层
    //加载插值图层
    var jetcolorScale = d3.scale.linear()
        .domain([0, 0.125, 0.375, 0.625, 0.875, 1])
        .range(["#000083", "#003caa", "#05ffff", "#ffff00", "#fa0000", "#800000"]);
    var interpolationDataSource;
    function loadInterData() {
        //加载由城市污染数据插值出的全国污染形式数据
        Cesium.GeoJsonDataSource.load('/data/citys.cut.topo.json').then(function (dataSource) {
            if (interpolationDataSource && viewer.dataSources.contains(interpolationDataSource)) {
                viewer.dataSources.remove(interpolationDataSource);
            }
            interpolationDataSource = dataSource;
            viewer.dataSources.add(interpolationDataSource);
            var entities = interpolationDataSource.entities.values;
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                var colorStr = jetcolorScale(entity.properties.DN / 200);
                //var colorStr = colorScale(entity.properties.DN);
                var rgbcolor = new Cesium.Color.fromCssColorString(colorStr);
                var rgbacolor = Cesium.Color.fromAlpha(rgbcolor, 0.8);
                //Set the polygon material to our random color.
                entity.polygon.material = rgbacolor;
                entity.polygon.outline = false;
            }
        });
    }
    function clearInterLayer() {
        if (interpolationDataSource) {
            viewer.dataSources.remove(interpolationDataSource);
        }
    }

    //加载风温图层
    var windEntity, tempEntity, animate;
    function loadWindTemp() {
        ///////////////////////////////////////////////////////////////////////////////////////////////
        d3.json("/data/current(10-60)-temp-surface-surface-gfs-1.0.json", function (err, jsondata) {
            if (err) {
                console.log(err);
            } else {
                //风速数据
                var temp = jsondata[0];

                //获取数据的经纬度范围
                var header = temp.header;
                var lonMin = Math.min(header.lo1, header.lo2), latMin = Math.min(header.la1, header.la2);  // 网格的起始 (e.g., 0.0E, 90.0N)
                var lonMax = Math.max(header.lo1, header.lo2), latMax = Math.max(header.la1, header.la2);

                var proportion = (lonMax - lonMin) / (latMax - latMin);
                var height = 500;
                var width = height * proportion;
                //创建canvas画布
                var canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                var context = canvas.getContext("2d");

                //设置像素点到经纬度范围的比例尺
                var lonScale = d3.scale.linear().domain([0, width]).range([lonMin, lonMax]);
                var latScale = d3.scale.linear().domain([0, height]).range([latMax, latMin]);

                var imageData = context.getImageData(0, 0, width, height);//[r,g,b,a,r,g,b,a,.......]

                //将数据按照顺序摆成二维数组
                var λ0 = header.lo1, φ0 = Math.max(header.la1, header.la2);  // 网格的起始 (e.g., 0.0E, 90.0N)
                var Δλ = header.dx, Δφ = header.dy;    // 网格点之间的距离 (e.g., 2.5 deg lon, 2.5 deg lat)
                var ni = header.nx, nj = header.ny;    // 网格点数 W-E and N-S (e.g., 144 x 73)
                //scanmode=64
                var grid = [], p = 0;
                for (var j = nj - 1; j >= 0; j--) {
                    var row = [];
                    for (var i = 0; i < ni; i++ , p++) {
                        row[i] = temp.data[p];
                    }
                    grid[j] = row;
                }

                //获取每一个像素位置所对应的canvas数据位置
                function getRgbaPos(x, y) {
                    return (y * width + x) * 4;
                }

                function setRgbaData(x, y, rgba) {
                    var pos = getRgbaPos(x, y);
                    imageData.data[pos] = rgba[0];
                    imageData.data[pos + 1] = rgba[1];
                    imageData.data[pos + 2] = rgba[2];
                    imageData.data[pos + 3] = rgba[3];
                }

                var tempColorScale = d3.scale.linear()
                    .domain([193, 206, 219, 233.15, 255.372, 273.15, 275.15, 291, 298, 311, 328])
                    .range(["#25042a", "#290a82", "#512828", "#c02595", "#46d7d7", "#1554bb", "#18840e", "#f7fb3b", "#eba715", "#e64727", "#581b43"]);

                /**
                 * 双线性插值标量
                 */
                function bilinearInterpolateScalar(x, y, g00, g10, g01, g11) {
                    var rx = (1 - x);
                    var ry = (1 - y);
                    return g00 * rx * ry + g10 * x * ry + g01 * rx * y + g11 * x * y;
                }

                function isValue(x) {
                    return x !== null && x !== undefined;
                }

                //由坐标值插值出此处的数值
                function interpolate(λ, φ) {
                    var i = (λ - λ0) / Δλ;  // calculate longitude index in wrapped range [0, 180)
                    var j = (φ0 - φ) / Δφ;  // calculate latitude index in direction +90 to 0

                    var fi = Math.floor(i), ci = fi + 1;
                    var fj = Math.floor(j), cj = fj + 1;

                    var row;
                    if ((row = grid[fj])) {
                        var g00 = row[fi];
                        var g10 = row[ci];
                        if (isValue(g00) && isValue(g10) && (row = grid[cj])) {
                            var g01 = row[fi];
                            var g11 = row[ci];
                            if (isValue(g01) && isValue(g11)) {
                                // All four points found, so interpolate the value.
                                return bilinearInterpolateScalar(i - fi, j - fj, g00, g10, g01, g11);
                            }
                        }
                    }
                    // console.log("cannot interpolate: " + λ + "," + φ + ": " + fi + " " + ci + " " + fj + " " + cj);
                    return null;
                }

                for (var j = 0; j < height; j++) {
                    for (var i = 0; i < width; i++) {
                        var lon = lonScale(i);
                        var lat = latScale(j);
                        var value = interpolate(lon, lat);
                        var color = d3.rgb(tempColorScale(value));
                        var rgba = [color.r, color.g, color.b, 150];
                        setRgbaData(i, j, rgba);
                    }
                }

                //context.clearRect(0, 0, width, height);
                context.putImageData(imageData, 0, 0);
                for (var i = 0; i < 500; i = i + 50) {
                    context.fillRect(0, i, 50, 5);
                }

                tempEntity = viewer.entities.add({
                    rectangle: {
                        coordinates: Cesium.Rectangle.fromDegrees(60, 10, 150, 60),
                        height: 100000,
                        material: new Cesium.ImageMaterialProperty({
                            image: canvas,
                            color: Cesium.Color.fromBytes(255, 255, 255, Cesium.Color.floatToByte(0.99))
                        }),
                    }
                });
                _.extend(tempEntity.rectangle.material.image, { _value: canvas.toDataURL() });
            }
        });

        ///////////////////////////////////////////////////////////////////////////////////////////////
        d3.json("/data/current-wind-surface-level-gfs-1.0.json", function (err, jsondata) {
            if (err) {
                console.log(err);
            } else {
                animate = true;
                var INTENSITY_SCALE_STEP = 10;            // 粒子强度色标的步长大小
                var MAX_PARTICLE_AGE = 20;               // 在重新生成之前颗粒被画出的最大帧数
                var PARTICLE_LINE_WIDTH = 1.0;            // 绘制粒子的线宽
                var PARTICLE_MULTIPLIER = 10;              // 粒子计数标量 (completely arbitrary--this values looks nice)
                var FRAME_RATE = 100;                      // 每帧所需的毫秒数
                var NULL_WIND_VECTOR = [NaN, NaN, null];  // 矢量场外的未定义位置的单位 [u, v, mag]

                //风速数据
                var wind_U = jsondata[0];
                var wind_V = jsondata[1];
                //获取数据的经纬度范围
                var header = wind_U.header;
                var lonMin = Math.min(header.lo1, header.lo2), latMin = Math.min(header.la1, header.la2);  // 网格的起始 (e.g., 0.0E, 90.0N)
                var lonMax = Math.max(header.lo1, header.lo2), latMax = Math.max(header.la1, header.la2);
                //宽高比
                var proportion = (lonMax - lonMin) / (latMax - latMin);
                var height = 500;
                var width = height * proportion;
                //设置像素点到经纬度范围的比例尺
                var lonScale = d3.scale.linear().domain([0, width]).range([lonMin, lonMax]);
                var latScale = d3.scale.linear().domain([0, height]).range([latMin, latMax]);
                //创建canvas画布
                var canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                var context = canvas.getContext("2d");

                windEntity = viewer.entities.add({
                    rectangle: {
                        coordinates: Cesium.Rectangle.fromDegrees(60, 10, 150, 60),
                        height: 100000,
                        material: new Cesium.ImageMaterialProperty({
                            image: canvas,
                            color: Cesium.Color.fromBytes(255, 255, 255, Cesium.Color.floatToByte(0.99))
                        }),
                    }
                });

                //将数据按照顺序摆成二维数组
                var λ0 = header.lo1, φ0 = Math.max(header.la1, header.la2);  // 网格的起始 (e.g., 0.0E, 90.0N)
                var Δλ = header.dx, Δφ = header.dy;    // 网格点之间的距离 (e.g., 2.5 deg lon, 2.5 deg lat)
                var ni = header.nx, nj = header.ny;    // 网格点数 W-E and N-S (e.g., 144 x 73)
                //将风速数据组合成数组
                var grid = [], p = 0;
                for (var j = 0; j < nj; j++) {//scanmode=0
                    var row = [];
                    for (var i = 0; i < ni; i++ , p++) {
                        row[i] = [wind_U.data[p], wind_V.data[p]];
                    }
                    grid[j] = row;
                }

                /**
                 * 双线性插值矢量
                 */
                function bilinearInterpolateVector(x, y, g00, g10, g01, g11) {
                    var rx = (1 - x);
                    var ry = (1 - y);
                    var a = rx * ry, b = x * ry, c = rx * y, d = x * y;
                    var u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
                    var v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
                    return [u, v, Math.sqrt(u * u + v * v)];
                }
                //计算每一个像素点出的风矢量
                var columns = [];
                for (var j = 0; j < height; j++) {
                    var column = [];
                    for (var i = 0; i < width; i++) {
                        var wind = getWind(i, j);
                        column[i] = wind;
                    }
                    columns[j] = column;
                }
                //判断是否是数值
                function isValue(x) {
                    return x !== null && x !== undefined;
                }
                //由所给的[x,y]插值出此处的风矢量
                function getWind(x, y) {
                    var lon = lonScale(x);
                    var lat = latScale(y);
                    return interpolate(lon, lat);  // 当前位置的矢量
                }

                function field(x, y) {
                    var column = columns[Math.round(y)];
                    return column && column[Math.round(x)] || NULL_WIND_VECTOR;
                }
                //判断此点是否定义
                var isDefined = function (x, y) {
                    return field(x, y)[2] !== null;
                }

                //由坐标值插值出此处的数值
                function interpolate(λ, φ) {
                    var i = (λ - λ0) / Δλ;  // calculate longitude index in wrapped range [0, 180)
                    var j = (φ0 - φ) / Δφ;  // calculate latitude index in direction +90 to 0

                    var fi = Math.floor(i), ci = fi + 1;
                    var fj = Math.floor(j), cj = fj + 1;

                    //         1      2           After converting λ and φ to fractional grid indexes i and j, we find the
                    //        fi  i   ci          four points "G" that enclose point (i, j). These points are at the four
                    //         | =1.4 |           corners specified by the floor and ceiling of i and j. For example, given
                    //      ---G--|---G--- fj 8   i = 1.4 and j = 8.3, the four surrounding grid points are (1, 8), (2, 8),
                    //    j ___|_ .   |           (1, 9) and (2, 9).
                    //  =8.3   |      |
                    //      ---G------G--- cj 9   Note that for wrapped grids, the first column is duplicated as the last
                    //         |      |           column, so the index ci can be used without taking a modulo.

                    var row;
                    if ((row = grid[fj])) {
                        var g00 = row[fi];
                        var g10 = row[ci];
                        if (isValue(g00) && isValue(g10) && (row = grid[cj])) {
                            var g01 = row[fi];
                            var g11 = row[ci];
                            if (isValue(g01) && isValue(g11)) {
                                // All four points found, so interpolate the value.
                                return bilinearInterpolateVector(i - fi, j - fj, g00, g10, g01, g11);
                            }
                        }
                    }
                    return NULL_WIND_VECTOR;
                }

                function asColorStyle(r, g, b, a) {
                    return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
                }
                /**
                 * @returns {Array} of wind colors and a method, indexFor, that maps wind magnitude to an index on the color scale.
                 * 风颜色和方法，indexFor，将风量映射到颜色标度上的索引。
                 */
                function windIntensityColorScale(step, maxWind) {
                    var result = [];
                    for (var j = 170; j >= 0; j -= step) {
                        //result.push(asColorStyle(j, j, j, 1.0));
                        result.push(asColorStyle(j, j, 255, 1.0));
                    }
                    result.indexFor = function (m) {  // map wind speed to a style
                        return Math.floor(Math.min(m, maxWind) / maxWind * (result.length - 1));
                    };
                    return result;
                }

                var maxIntensity = 17;// maxIntensity是粒子颜色强度最大时的速度        
                var colorStyles = windIntensityColorScale(INTENSITY_SCALE_STEP, maxIntensity);
                var buckets = colorStyles.map(function () { return []; });
                //粒子数量
                var particleCount = Math.round(width * PARTICLE_MULTIPLIER);
                var fadeFillStyle = "rgba(0, 0, 0, 0.97)";

                var randomize = function (o) {
                    var x, y;
                    var safetyNet = 0;
                    do {
                        x = Math.round(_.random(0, width));
                        y = Math.round(_.random(0, height));
                    } while (!isDefined(x, y) && safetyNet++ < 30);
                    o.x = x;
                    o.y = y;
                    return o;
                };

                var particles = [];
                for (var i = 0; i < particleCount; i++) {
                    particles.push(randomize({ age: _.random(0, MAX_PARTICLE_AGE) }));
                }

                function evolve() {
                    buckets.forEach(function (bucket) { bucket.length = 0; });
                    particles.forEach(function (particle) {
                        if (particle.age > MAX_PARTICLE_AGE) {
                            randomize(particle).age = 0;
                        }
                        var x = particle.x;
                        var y = particle.y;
                        var v = field(x, y);  // 当前位置的矢量
                        var m = v[2];
                        if (m === null) {
                            particle.age = MAX_PARTICLE_AGE;  // particle has escaped the grid, never to return...
                        } else {
                            var xt = x + v[0];//U指向东方
                            var yt = y - v[1];//V指向北方
                            if (isDefined(xt, yt)) {
                                // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
                                particle.xt = xt;
                                particle.yt = yt;
                                buckets[colorStyles.indexFor(m)].push(particle);
                            } else {
                                // 粒子是不可见的，但它仍然移动通过区域
                                particle.x = xt;
                                particle.y = yt;
                            }
                        }
                        particle.age += 1;
                    });
                }

                context.lineWidth = PARTICLE_LINE_WIDTH;
                context.fillStyle = fadeFillStyle;

                function draw() {
                    // 淡化现有的粒子轨迹
                    // context.save();
                    // context.globalAlpha = .16;
                    // context.globalCompositeOperation = 'destination-out';
                    // context.fillStyle = '#000';
                    // context.fillRect(0, 0, width, height);
                    // context.restore();
                    context.clearRect(0, 0, width, height);
                    // 绘制新的粒子轨迹
                    buckets.forEach(function (bucket, i) {
                        if (bucket.length > 0) {
                            context.beginPath();
                            context.strokeStyle = colorStyles[i];
                            bucket.forEach(function (particle) {
                                context.moveTo(particle.x, particle.y);
                                context.lineTo(particle.xt, particle.yt);
                                particle.x = particle.xt;
                                particle.y = particle.yt;
                            });
                            context.stroke();
                        }
                    });
                }

                (function frame() {
                    evolve();
                    draw();
                    _.extend(windEntity.rectangle.material.image, { _value: canvas.toDataURL() });
                    if (animate) {
                        setTimeout(frame, FRAME_RATE);
                    }
                })();
            }
        });
    }

    //清理风温图层
    function clearWindTemp() {
        if (windEntity && viewer.entities.contains(windEntity)) {
            animate = false;
            viewer.entities.remove(windEntity);
        }
        if (tempEntity && viewer.entities.contains(tempEntity)) {
            viewer.entities.remove(tempEntity);
        }
    }
    //图层变化时的动作
    function changeLayer(layer) {
        if (layer == "windTemp") {
            hideProvince();
            selector.show = false;
            figure.hide();
            clearInterLayer();
            loadWindTemp();
        } else if (layer == "interpolation") {
            hideProvince();
            selector.show = false;
            figure.hide();
            clearWindTemp();
            loadInterData();
        } else {
            clearWindTemp();
            clearInterLayer();
        }
    }

    function enableMonitor() {
        //移除原来的数据源
        removeLevels();
        d3.select(".cesium-viewer-infoBoxContainer").style("display", "block");
        useStreetMap();
        loadCityData();
        animate = true;
        //由镜头缩放事件确定镜头所在的高度
        viewer.camera.moveEnd.addEventListener(focusHeightListener);
        //由单击事件确定接下来的动作
        screenSpaceEventHandler.setInputAction(pickProvince, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        //由鼠标移动事件确定现在关注的省
        screenSpaceEventHandler.setInputAction(findProvinceStation, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        //shift+左键的动作
        screenSpaceEventHandler.setInputAction(startClickShift, Cesium.ScreenSpaceEventType.LEFT_DOWN, Cesium.KeyboardEventModifier.SHIFT);
        screenSpaceEventHandler.setInputAction(endClickShift, Cesium.ScreenSpaceEventType.LEFT_UP, Cesium.KeyboardEventModifier.SHIFT);
        screenSpaceEventHandler.setInputAction(endClickShift, Cesium.ScreenSpaceEventType.LEFT_UP);
        //在shift+拖拽鼠标时画出选择矩形框
        screenSpaceEventHandler.setInputAction(drawSelector, Cesium.ScreenSpaceEventType.MOUSE_MOVE, Cesium.KeyboardEventModifier.SHIFT);
        //figure.show();
        focusHeightListener();
    }

    function disableMonitor() {
        d3.select(".cesium-viewer-infoBoxContainer").style("display", "none");
        changeLayer("none");
        hideProvince();
        figure.clearFigure();
        figure.hide();
        selector.show = false;
        animate = false;
        //隐藏图层
        stationDataSource.show = false;
        citiesDataSource.show = false;
        capitalCityDataSource.show = false;

        //由镜头缩放事件确定镜头所在的高度
        viewer.camera.moveEnd.removeEventListener(focusHeightListener);
        //由单击事件确定接下来的动作
        screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        //由鼠标移动事件确定现在关注的省
        screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        //shift+左键的动作
        screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN, Cesium.KeyboardEventModifier.SHIFT);
        screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP, Cesium.KeyboardEventModifier.SHIFT);
        screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
        //在shift+拖拽鼠标时画出选择矩形框
        screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE, Cesium.KeyboardEventModifier.SHIFT);

        reloadData();
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
        start: start,
        changeLayer: changeLayer,
        enableMonitor: enableMonitor,
        disableMonitor: disableMonitor
    }
}