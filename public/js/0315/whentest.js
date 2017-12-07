// version:1.0        author:sunzq        Email:zengqiang365@163.com
/*********************************************************************
 * 地图初始化选项
 *********************************************************************/

//本地地图服务
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
    imageryProvider: Cesium.createOpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
    }),//图像图层提供者，仅baseLayerPicker设为false有意义
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
//去除版权信息
viewer._cesiumWidget._creditContainer.style.display = "none";
//设置视角，将视角设置到中国，10000km高度
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(119, 40, 10000000.0)
});

//加载位置信息（经/纬/高度）
var positionGrid = new Array(15);//高度 15*[194*194]
var latGrid = new Array();//纬度 [194*194]
var longGrid = new Array();//经度 [194*194]
var vertical_lonGrid;//经度数组 [194][194]
var vertical_latGrid;//纬度数组 [194][194]

var num = 0;

function buildGrid() {
    var urlArry = new Array();
    for (var k = 0; k < 15; k++) {
        var url = "/data/gmp/gmp-level" + k + ".json";
        urlArry.push(url);
    }

    var loadLat = Cesium.loadJson("/data/coordinate/lat.json").then(function (jsonData) {
        latGrid = jsonData.XLAT;
        vertical_latGrid = _.chunk(latGrid, 194);
        return vertical_latGrid;
    });
    var loadLon = Cesium.loadJson("/data/coordinate/long.json").then(function (jsonData) {
        longGrid = jsonData.XLONG;
        vertical_lonGrid = _.chunk(longGrid, 194);
        return vertical_lonGrid;
    });

    var ccc = Promise.map(urlArry, function (url, index) {
        return Cesium.loadJson(url).then(function (jsonData) {
            positionGrid[index] = jsonData[0].data;
            return positionGrid;
        })
    })

    return Promise.all([loadLat, loadLon, ccc]);

}

function buildLevels(num) {
    for (var i = 0; i < num; i++) {
        var levelName = "level-" + i;
        var tmpDataSource = new Cesium.CustomDataSource(levelName);
        viewer.dataSources.add(tmpDataSource);
    }
}
// function removeLevels(){
//     viewer.dataSources
// }
buildLevels(15);
// buildGrid().then(function () {
//     console.log(vertical_latGrid.length);
//     console.log(vertical_lonGrid.length);
//     console.log(num);
// })
buildGrid().then(console.log)