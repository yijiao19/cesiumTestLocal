// version:1.0        author:sunzq        Email:zengqiang365@163.com
//////////////////////////////////////////////////////////////////////////////////////
//初始化viewer，option选项{satelliteMapUrl, streetMapUrl, terrainMapUrl}
function initViewer(eleID, dataServer, imageServer, options) {
  //-------------------------设置地图服务-----------------------------------------
  var eleName = eleID.replace("#", ""); //如果有#号，则去掉
  var satelliteTMS; //卫星地图服务
  var streetTMS; //街道地图服务
  var terrainTMS; //地形服务
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
    //不加载地形
    terrainTMS = new Cesium.EllipsoidTerrainProvider();
    // terrainTMS = new Cesium.VRTheWorldTerrainProvider({
    //   url: 'http://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/',
    //   credit: 'Terrain data courtesy VT MÄK'
    // });
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
    animation: false, //是否创建动画小器件，左下角仪表
    timeline: false, //是否显示时间轴
    vrButton: false, //是否显示VR按钮
    fullscreenButton: false, //是否显示全屏按钮
    geocoder: false, //是否显示geocoder小器件，右上角查询按钮
    homeButton: false, //是否显示Home按钮
    infoBox: false, //是否显示信息框
    sceneModePicker: true, //是否显示3D/2D选择器
    selectionIndicator: false, //是否显示选取指示器组件
    navigationHelpButton: false, //是否显示右上角的帮助按钮
    baseLayerPicker: false, //是否显示图层选择器
    imageryProvider: streetTMS, //图像图层提供者，仅baseLayerPicker设为false有意义
    terrainExaggeration: 40,
    useDefaultRenderLoop: true, //如果需要控制渲染循环，则设为true
    targetFrameRate: undefined, //使用默认render loop时的帧率
    showRenderLoopErrors: false, //如果设为true，将在一个HTML面板中显示错误信息
    automaticallyTrackDataSourceClocks: true, //自动追踪最近添加的数据源的时钟设置
    contextOptions: undefined, //传递给Scene对象的上下文参数（scene.options）
    sceneMode: Cesium.SceneMode.SCENE3D, //初始场景模式
    mapProjection: new Cesium.WebMercatorProjection(), //2D时地图投影体系
    dataSources: new Cesium.DataSourceCollection() //需要进行可视化的数据源的集合
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
    viewer.scene.morphComplete.addEventListener(function() {
      setTimeout(function() {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat,
            height)
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
    color: "jet",
    realHeight: false,
    //realHeight: ("realHeight" in options) ? options.realHeight : true,
    time: moment.utc("2017-05-20T06:00:00.000"),

    //2017-05-19T06:00:00.000Z
    coverageId: "wrfchem_ll_4D",
  };
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
  var positionGrid = new Array(15); //高度 15*[194*194]
  var latGrid = new Array(); //纬度 [194*194]
  var longGrid = new Array(); //经度 [194*194]
  //var vertical_lonGrid; //经度数组 [194][194]
  //var vertical_latGrid; //纬度数组 [194][194]

  function buildGrid() {
    var urlArry = new Array();
    for (var k = 0; k < 15; k++) {
      var url = "/data/gmp/gmp-level" + k + ".json";
      urlArry.push(url);
    }

    //构建经纬度网格中心点坐标数组
    var i = 0;
    latRange[0] = parseFloat(latRange[0]);
    latRange[1] = parseFloat(latRange[1]);
    for (var lat = latRange[0]; lat <= latRange[1]; lat += parseFloat(0.1)) {
      lat = lat.toFixed(2);
      latGrid[i++] = lat;
      lat = parseFloat(lat);
    }
    console.log(latGrid);
    i = 0;
    lonRange[0] = parseFloat(lonRange[0]);
    lonRange[1] = parseFloat(lonRange[1]);
    for (var long = lonRange[0]; long <= lonRange[1]; long += parseFloat(0.1)) {
      long = long.toFixed(2);
      longGrid[i++] = long;
      long = parseFloat(long);
    }
    console.log(longGrid);
    // i = 0;
    // for (var gmp = 1; gmp <= 31; gmp++) {
    //   positionGrid[i++] = gmp;
    // }
    //加载网格点高度数据

    var loadGmp = Promise.map(urlArry, function(url, index) {
      return Cesium.loadJson(url).then(function(jsonData) {
        positionGrid[index] = jsonData[0].data;
        return positionGrid;
      });
    });

    return Promise.all([loadGmp]);


  }

  //----------------剖面图的操作--------------------------------------------------
  //剖面图的实体
  var longEntity, latEntity;
  var heightEntity;

  var latRange = [15, 50.9]; //网格中心点范围
  var lonRange = [85, 130.9]; //网格中心点范围
  var heightRange = [0, 1];
  //水平剖面
  function buildHeight() {


    heightEntity = viewer.entities.add({
      name: "height",
      show: false,
      rectangle: {
        //水平剖面范围为边界值
        coordinates: Cesium.Rectangle.fromDegrees(84.95, 14.95,
          130.95, 50.95),
        material: Cesium.Color.BLUE.withAlpha(0.0),
        height: 3000.0,
      }
    });
  }
  //纬向剖面
  function buildVlat() {

    var wallLatArray = new Array();
    var wallMinHeightArray = new Array();
    var wallMaxHeightArray = new Array();

    // var deltaLon;
    // //deltaLon = parseInt(imgLon.length / 10);
    // deltaLon = (131 - 85) / 10;
    // var count = parseInt((lonRange[1] - lonRange[0]) / deltaLon);
    // console.log(deltaLon);
    //
    // var templat;
    // wallLatArray[0] = lonRange[0];
    // wallLatArray[1] = latRange[0];
    // for (var i = 1; i <= (count); i++) {
    //   templat = parseFloat(wallLatArray[(i - 1) * 2]) + deltaLon;
    //   wallLatArray[i * 2] = templat.toFixed(1);
    //   wallLatArray[i * 2 + 1] = latRange[0];
    //   wallMinHeightArray[i - 1] = 0;
    //   wallMaxHeightArray[i - 1] = 900000;
    // }
    // wallLatArray[count * 2] = lonRange[1];
    // wallLatArray[count * 2 + 1] = latRange[0];
    // //绘制10个分隔点，保证wall是顺沿纬线绘制的
    var wallLatArray = new Array(11);
    var wallMinHeightArray = new Array(11);
    var wallMaxHeightArray = new Array(11);
    var deltaLon;
    deltaLon = parseInt(longGrid.length / 10);
    console.log(deltaLon);
    for (var i = 0; i <= 10; i++) {
      wallLatArray[i * 2] = longGrid[i * deltaLon];
      wallLatArray[i * 2 + 1] = latGrid[0];
      wallMinHeightArray[i] = 0;
      wallMaxHeightArray[i] = 900000;
    }
    wallLatArray[20] = longGrid[10 * deltaLon - 1];
    console.log("origin:" + wallLatArray);
    //初始剖面位置
    var initLatNum = ("defaultLatEnt" in options) ? options.defaultLatEnt :
      100;

    latEntity = viewer.entities.add({
      show: false,
      name: 'vertical-lat',
      wall: {
        positions: Cesium.Cartesian3.fromDegreesArray(wallLatArray),
        maximumHeights: wallMaxHeightArray,
        minimumHeights: wallMinHeightArray,
        material: Cesium.Color.BLUE,

      }
    });
  }
  //经向剖面
  function buildVlon() {
    //初始剖面位置
    var initLonNum = ("defaultLonEnt" in options) ? options.defaultLonEnt :
      119;

    longEntity = viewer.entities.add({
      show: false,
      name: 'vertical-long',
      wall: {
        positions: Cesium.Cartesian3.fromDegreesArray([longGrid[0], 14.95,
          longGrid[0], 50.95
        ]),
        maximumHeights: [900000, 900000],
        minimumHeights: [0, 0],
        material: Cesium.Color.BLUE,
      }
    });
  }

  //设置剖面位置、图像
  function setHeightImage(imgpath) {
    console.log("setHeightImage");
    heightEntity.rectangle.material = imgpath;
    //longEntity.wall.material = imgpath;
  }

  function setHeightEntPosition(nowNum) {
    console.log(nowNum);
    heightEntity.rectangle.height = 30000.0 * nowNum;
  }

  function setHeightEntSize() {
    heightEntity.rectangle.coordinates = Cesium.Rectangle.fromDegrees(lonRange[
        0], latRange[0],
      lonRange[1], latRange[1]);
  }

  function setLonImage(imgpath) {
    //console.log(imgpath);
    longEntity.wall.material = imgpath;
  }

  function setLonEntPosition(nowNum) {
    // console.log("lonPosition:(" + nowNum + "," + 15 + "," + nowNum +
    //   "," + 50.95 + ")");
    longEntity.wall.positions = Cesium.Cartesian3.fromDegreesArray([
      nowNum, 14.95, nowNum,
      50.95
    ]);
  }

  function setLonEntSize(num) {
    //console.log(nowNum);
    longEntity.wall.positions = Cesium.Cartesian3.fromDegreesArray([
      num, latRange[0], num,
      latRange[1]
    ]);
  }

  function setLatImage(imgpath) {
    latEntity.wall.material = imgpath;

  }

  function setLatEntPosition(nowNum) {
    //latEntity.wall.material = imgpath;
    console.log("latPosition:(" + lonRange[0] + "," + nowNum +
      "," + lonRange[1] + "," + nowNum + ")");
    var wallLatArray = new Array();

    var deltaLon;

    deltaLon = (131 - 85) / 10;
    var count = parseInt((lonRange[1] - lonRange[0]) / deltaLon);
    console.log(deltaLon);
    //count++;

    var templat;
    wallLatArray[0] = lonRange[0];
    wallLatArray[1] = nowNum;
    for (var i = 1; i < (count); i++) {
      templat = parseFloat(wallLatArray[(i - 1) * 2]) + deltaLon;
      wallLatArray[i * 2] = templat.toFixed(1);
      wallLatArray[i * 2 + 1] = nowNum;
    }
    wallLatArray[count * 2] = lonRange[1];
    wallLatArray[count * 2 + 1] = nowNum;
    // wallLatArray[0] = lonRange[0];
    // wallLatArray[1] = nowNum;
    // while (wallLatArray[i * 2] < lonRange[1]) {
    //   i++;
    //   templat = parseFloat(wallLatArray[(i - 1) * 2]) + deltaLon;
    //   wallLatArray[i * 2] = templat.toFixed(1);
    //   wallLatArray[i * 2 + 1] = nowNum;
    // }
    console.log("newwall:" + wallLatArray);
    latEntity.wall.positions = Cesium.Cartesian3.fromDegreesArray(wallLatArray);
  }

  function setLatEntSize(num) {
    //console.log(nowNum);
    latEntity.wall.positions = Cesium.Cartesian3.fromDegreesArray([
      lonRange[0], num,
      lonRange[1], num
    ]);
  }
  //剖面图示意实体的显示设置
  function setVerticalShow() {
    latEntity.show = true;
    longEntity.show = true;
    heightEntity.show = true;
  }

  function setVerticalHide() {
    latEntity.show = false;
    longEntity.show = false;
    heightEntity.show = false;
  }
  //使用Plotly绘制剖面图热力图

  //绘制plotly矢量图
  function drawPlotly(graphDiv, name, type, data, callback) {
    var xAxis = new Array(); //x
    var yAxis = new Array(); //y
    var pollute = new Array();

    var coverageId = "wrfchem_ll_4D";
    //var ansi = "ansi(%222017-05-19T09:00:00.000Z%22)";
    var ansi = "ansi(%22" + currentTime.utc().format("YYYY-MM-DDTHH:mm:ss.SSSS") +
      "Z%22)";
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
  //绘制径向纬向剖面图图像
  function drawImage(graphDiv, name, type, data, callback) {
    console.log("unimap3D: drawImage");
    var id = "#" + graphDiv;
    var d3 = Plotly.d3.select(id);
    var img_jpg = d3.select("#img-export");
    var pollute = new Array();



    var coverageId = "wrfchem_ll_4D";
    var ansi = "ansi(%22" + currentTime.utc().format("YYYY-MM-DDTHH:mm:ss.SSSS") +
      "Z%22)";
    var bottom_top = "bottom_top(" + data + ")";
    var lat_slicing = "Lat(" + data + ")";
    var long_slicing = "Long(" + data + ")";
    var range = "pm25";
    var format = "application/json";
    var dataType;
    var imgpath;
    var xAxis = new Array();
    var xRange = new Array(2);

    switch (type) {
      case "h":
        dataType = bottom_top;
        break;
      case "lon":
        dataType = long_slicing;
        for (var i = 0; i < 360; i++) {
          xAxis.push(15 + 0.1 * i);
        }
        xRange[0] = latRange[0];
        xRange[1] = latRange[1];
        break;
      case "lat":
        dataType = lat_slicing;
        for (var i = 0; i < 460; i++) {
          xAxis.push(85 + 0.1 * i);
        }
        xRange[0] = lonRange[0];
        xRange[1] = lonRange[1];
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
        x: xAxis,
        z: figure,
        opacity: 1,
        zmax: 100,
        zmin: 0,

        //zsmooth: 'best',
        colorscale: 'Jet',
        showscale: false,
      };

      var data = [trace1];

      var layout = {
        xaxis: {
          range: [xRange[0], xRange[1]]
        },
        paper_bgcolor: '#7f7f7f',
        margin: {
          l: 0,
          r: 0,
          b: 0,
          t: 0,
          //  pad: 0
        },

      };
      Plotly.newPlot(graphDiv, data, layout)
        .then(
          function(gd) {
            Plotly.toImage(gd, {
                height: 1000,
                width: 4600
              })
              .then(
                function(url) {
                  img_jpg.attr("src", url);
                  callback(url);
                  return Plotly.toImage(gd, {
                    format: 'png',
                    height: 1000,
                    width: 4600
                  });
                }
              )
          })

      ;

    });

  }

  //绘制水平剖面图+中国地图topojson
  function drawHeightImage(graphDiv, name, data, callback) {
    console.log(graphDiv);
    var xAxis = new Array();
    var yAxis = new Array();
    for (var i = 0; i < 360; i++) {
      yAxis.push(15 + 0.1 * i);
    }
    for (var i = 0; i < 460; i++) {
      xAxis.push(85 + 0.1 * i);
    }

    var id = "#" + graphDiv;
    var d3 = Plotly.d3.select(id);
    var img_jpg = d3.select("#img-export");
    var pollute = new Array();

    var coverageId = "wrfchem_ll_4D";
    //var ansi = "ansi(%222017-05-20T06:00:00.000Z%22)";
    var ansi = "ansi(%22" + currentTime.utc().format("YYYY-MM-DDTHH:mm:ss.SSSS") +
      "Z%22)";
    var bottom_top = "bottom_top(" + data + ")";
    //var lat_slicing = "Lat(" + data + ")";
    //var long_slicing = "Long(" + data + ")";
    var range = "pm25";
    var format = "application/json";
    var dataType = bottom_top;
    var imgpath;

    var ratio;
    var w, h;

    w = lonRange[1] - lonRange[0];
    h = latRange[1] - latRange[0];
    ratio = w / h;


    var srcPolluteJson =
      "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage" +
      "&COVERAGEID=" + coverageId + "&SUBSET=" + ansi + "&SUBSET=" +
      dataType +
      "&RANGESUBSET=" + range + "&FORMAT=" + format;
    //var srcJson = "http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=wrfchem_ll_4D&RANGESUBSET=pm25&FORMAT=application/json";
    console.log("unimap3D:drawHeightImage");

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
        x: xAxis,
        y: yAxis,
        z: figure,
        opacity: 1,
        zmax: 100,
        zmin: 0,

        //zsmooth: 'best',
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
      var data = [trace1];

      var layout = {
        xaxis: {
          range: [lonRange[0], lonRange[1]]
        },
        yaxis: {
          range: [latRange[0], latRange[1]]
        },
        paper_bgcolor: '#7f7f7f',
        width: 1000,
        height: 1000,
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
            'range': [lonRange[0], lonRange[1]]
          },
          lataxis: {
            showgrid: true,
            dtick: 5,
            'range': [latRange[0], latRange[1]]
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
                height: 4600,
                width: 3600
              })
              .then(
                function(url) {
                  img_jpg.attr("src", url);
                  //console.log(url);
                  callback(url);
                  return Plotly.toImage(gd, {
                    format: 'png',
                    height: 4600,
                    width: 3600
                  });
                }
              )
          })

      ;

    });

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
    viewer.dataSources._dataSources.forEach(function(source) {
      if (source.name.indexOf('level') == 0) {
        sourceArray.push(source);
      }
    });
    return sourceArray;
  }
  //删除污染物图层
  function removeLevels() {
    getOverlaySources().forEach(function(s) {
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
    var geturl = configuration.dataServerAddr +
      "/data/pollute/2015052506/pblh/" + polluteTime + "PBLH.json";
    Cesium.loadJson(geturl).then(function(jsonData) {
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
        var latitude1 = latGrid[i],
          latitude2 = latGrid[i + 195];
        var longitude1 = longGrid[i],
          longitude2 = longGrid[i + 195];
        var a = entities.add({
          rectangle: {
            coordinates: Cesium.Rectangle.fromDegrees(longitude1,
              latitude1, longitude2, latitude2),
            height: height,
            material: Cesium.Color.NAVY.withAlpha(0.2)
          }
        });
      }
    }).otherwise(function(error) {
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
      var low = overlay.valueRange.min,
        high = overlay.valueRange.max;
      return function(num) {
        var colorStr = col((num - low) / (high - low));
        var rgbcolor = new Cesium.Color.fromCssColorString(colorStr);
        //var alpha = 1.0;
        var alpha = overlay.alphaScale(num);
        var rgbacolor = new Cesium.Color.fromAlpha(rgbcolor, alpha);
        return rgbacolor;
      }
    } else {
      return function(num) {
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
    var mapRange = col ? {
      min: 0,
      max: 1
    } : overlay.valueRange;

    var colorCanvas = colorBar.node();
    var width = colorCanvas.width,
      height = colorCanvas.height;
    var context = colorCanvas.getContext("2d"),
      n = width - 1;
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
      var color = d3.rgb(colorScale(num)); //D3V3的函数，V4中有改变
      context.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b +
        ")";
      context.fillRect(i, 0, 1, height);
    }

    function clamp(x, low, high) {
      return Math.max(low, Math.min(x, high));
    }
    //鼠标在上时显示值
    colorBar.on("mousemove", function() {
      var x = d3.mouse(this)[0];
      var pct = clamp((Math.round(x) - 2) / (n - 2), 0, 1);
      var value = spread(pct, overlay.valueRange.min, overlay.valueRange
          .max)
        .toFixed(2);
      var unit = overlay.units[0].label;
      colorBar.attr("title", value + " " + unit);
    });
  }

  function recolor() {
    var pixColorScale = getPixColorScale();
    getOverlaySources().forEach(function(sourcs) {
      var entities = sourcs.entities;
      entities.values.forEach(function(pix) {
        pix.box.material.color = pixColorScale(pix.value.value);
      })
    });
  }

  //----------------------------体像素渲染----------------------------------
  //由名称找到高度的datasource
  function findSource(level) {
    var source;
    var levelName = "level-" + level;
    viewer.dataSources._dataSources.forEach(function(s) {
      if (levelName == s.name) {
        source = s;
      }
    });
    return source;
  }
  //由层数找到高度
  function findHeight(level) {
    return (level) * 30000.0;
  }
  //将数据加载到地图上
  function load(builder, level) {
    console.log(level);
    var height = findHeight(level);
    var entities = (findSource(level)).entities;
    var layerName = overlay.type;
    var minValue = overlay.valueRange.min;
    var maxValue = overlay.valueRange.max;
    //获取对应的色谱
    var pixColorScale = getPixColorScale();
    latGrid = [];
    longGrid = [];
    var i = 0;
    for (var lat = parseFloat(latRange[0]); lat <= parseFloat(latRange[1]); lat =
      0.1 + parseFloat(lat)) {
      lat = lat.toFixed(2);

      latGrid[i++] = lat;
    }
    i = 0;
    for (var long = parseFloat(lonRange[0]); long <= parseFloat(lonRange[1]); long =
      0.1 + parseFloat(
        long)) {
      long = long.toFixed(2);
      longGrid[i++] = long;
    }

    for (var i = 0; i < builder.length; i++)
      for (var j = 0; j < builder[i].length; j++) {

        var tvalue = builder[i][j];
        if ((tvalue >= 30) && (tvalue <= maxValue)) {
          if (configuration.realHeight) {
            height = positionGrid[level][i] * 100;
          }
          var latitude = latGrid[i];
          var longitude = longGrid[j];
          var pixelcolor = pixColorScale(tvalue);
          var a = entities.add({
            value: {
              value: tvalue,
              lon: longitude,
              lat: latitude
            },
            name: '',
            position: Cesium.Cartesian3.fromDegrees(longitude, latitude,
              height),
            box: {
              dimensions: new Cesium.Cartesian3(10000, 12000,
                12000.0),
              material: pixelcolor
            }
          });
          //  console.log(pixelcolor);
        }
      }
  }

  //随纬度变化时，1经度之间的距离
  function distance(lat) {
    return 111700 * Math.cos(lat / 180 * Math.PI);
  }

  function getPolluteTime(mytime) {
    return "ansi(%22" + mytime.utc().format("YYYY-MM-DDTHH:mm:ss.SSSS") +
      "Z%22)";
    //return mytime.utc().format("YYYY-MM-DD_HH") + "-";
  }
  //根据选择的图层加载数据
  var loadData = function() {
    console.log("loadData");
    var urls = overlay.paths();
    urls.forEach(function(url, index) {
      (function(a, b) {
        //"http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=wrfchem_ll_4D&SUBSET=ansi(%222017-05-19T06:00:00.000Z%22)&SUBSET=bottom_top(0.5)&RANGESUBSET=pm25&FORMAT=application/json"
        //"http://172.18.0.15:8080/rasdaman/ows?&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=wrfchem_ll_4D&SUBSET=ansi(%222017-05-20T06:00:00.000Z%22)&SUBSET=Lat(14.95,50.95)&SUBSET=Long(100,130.95)&SUBSET=bottom_top(0.5)&RANGESUBSET=pm25&FORMAT=image/png
        var coverageId = configuration.coverageId;
        var polluteTime = getPolluteTime(configuration.time);
        var heightLevel = "bottom_top(" + (0.5 + b) + ")";
        // var lonSubset = "Long(" + (lonRange[0] - 0.05) + ',' + (
        //   lonRange[1] - 0.05) + ")";
        // var latSubset = "Lat(" + (latRange[0] - 0.05) + ',' + (latRange[
        //   1] - 0.05) + ")";
        var geturl = configuration.dataServerAddr +
          "&COVERAGEID=" + coverageId +
          "&SUBSET=" + polluteTime +
          //"&SUBSET=" + latSubset +
          //  "&SUBSET=" + lonSubset +
          "&SUBSET=" + heightLevel +
          "&RANGESUBSET=" + overlay.type +
          "&FORMAT=" + "application/json";
        console.log(geturl);
        //console.log(heightLevel);
        //var geturl = "/data/current-" + a;
        Cesium.loadJson(geturl).then(function(jsonData) {
          load(overlay.data(jsonData), b);
        }).otherwise(function(error) {
          console.log(error);
        });
      })
      (url, index);
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
    console.log(configuration.time);
    reloadData();
    reBuildPBLH();
  }

  //由筛选条件显示格点
  function setShowRange(ranges) {
    latRange = ranges.latRange;
    //console.log(latRange);
    lonRange = ranges.lonRange;
    heightRange = ranges.heightRange;
    var valRange = ranges.valRange;
    var layerName = configuration.overlayType;
    if (layerName == "temp") {
      valRange = [parseFloat(valRange[0]) + 273.15, parseFloat(valRange[1]) +
        273.15
      ];
    }

    getOverlaySources().forEach(function(sourcs) {
      var level = parseInt(sourcs.name.split("-")[1]) + 1;
      if (level >= heightRange[0] && level <= heightRange[1]) {
        sourcs.show = true;
        var entities = sourcs.entities;
        entities.suspendEvents();
        var billboardsList = entities.values;
        billboardsList.forEach(function(val, index, arr) {
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
    buildGrid().then(function() {
      buildHeight();
      buildVlat();
      buildVlon();
      loadData();
    })
  }

  return {
    getConfig: getConfig,
    setFocus: setFocus,
    buildImagePath: buildImagePath,
    setLatImage: setLatImage,
    setLonImage: setLonImage,
    setHeightImage: setHeightImage,
    setLonEntPosition: setLonEntPosition,
    setLonEntSize: setLonEntSize,
    setLatEntPosition: setLatEntPosition,
    setLatEntSize: setLatEntSize,
    setHeightEntPosition: setHeightEntPosition,
    setHeightEntSize: setHeightEntSize,
    drawHeightImage: drawHeightImage,
    drawImage: drawImage,
    drawPlotly: drawPlotly,
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
