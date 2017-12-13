var products = function () {
    "use strict";
    var serverAddr;

    function setServerAddr(addr) {
        serverAddr = addr;
    }

    /**
     * 定义基类，创建product,加载不同图层的数据
     */
    function buildProduct(overrides) {
        return _.extend({
            type: "",
            paths: function () {
                var urlArray = [];
                for (var i = 0; i < this.levelNum; i++) {
                    var url = this.type + "-level" + i + ".json";
                    urlArray.push(url);
                }
                return urlArray;
            },
            data: function (file) { return file[0] },
            valueRange: null,
            color: null,
            colorScale: null,
            alphaScale: null,
            levelNum: 0,
            description: ""
        },
            overrides);
    }

    //模式工厂
    var FACTORIES = {
        "so2": {
            matches: _.matches({ overlayType: "so2" }),
            create: function (attr) {
                return buildProduct({
                    type: "so2",
                    description: "二氧化硫",
                    levelNum: 15,
                    units: [
                        { label: "µg/m3", conversion: function (x) { return x; } }
                    ],
                    valueRange: { min: 90, max: 1000, step: 10, value: [50, 800], unit: "µg/m3" },
                    color: function (so2) {
                        var colorString = this.colorScale(so2);
                        var rgbcolor = new Cesium.Color.fromCssColorString(colorString);
                        var alpha = this.alphaScale(so2);
                        var rgbacolor = new Cesium.Color.fromAlpha(rgbcolor, alpha);
                        return rgbacolor;
                    },
                    alphaScale: d3.scale.linear().domain([0, 150, 800]).range([0, 0.5, 1]),
                    colorScale: d3.scale.linear()
                        .domain([0, 150, 300, 600, 700, 800, 1000])
                        .range(["#1e90ff", "#00ff00", "#ffff00", "#ff9900", "#ff0000", "#4c1130", "#312129"])
                });
            }
        },
        "no2": {
            matches: _.matches({ overlayType: "no2" }),
            create: function (attr) {
                return buildProduct({
                    type: "no2",
                    description: "二氧化氮",
                    levelNum: 15,
                    units: [
                        { label: "µg/m3", conversion: function (x) { return x; } }
                    ],
                    valueRange: { min: 30, max: 300, step: 10, value: [10, 300], unit: "µg/m3" },
                    color: function (no2) {
                        var colorString = this.colorScale(no2);
                        var rgbcolor = new Cesium.Color.fromCssColorString(colorString);
                        var alpha = this.alphaScale(no2);
                        var rgbacolor = new Cesium.Color.fromAlpha(rgbcolor, alpha);
                        return rgbacolor;
                    },
                    alphaScale: d3.scale.linear().domain([0, 50, 300]).range([0, 0.5, 1]),
                    colorScale: d3.scale.linear()
                        .domain([0, 50, 100, 150, 200, 250, 300])
                        .range(["#1e90ff", "#00ff00", "#ffff00", "#ff9900", "#ff0000", "#4c1130", "#312129"])
                });
            }
        },
        "co": {
            matches: _.matches({ overlayType: "co" }),
            create: function (attr) {
                return buildProduct({
                    type: "co",
                    description: "一氧化碳",
                    levelNum: 15,
                    units: [
                        { label: "mg/m3", conversion: function (x) { return x; }, precision: 5 }
                    ],
                    valueRange: { min: 0.03, max: 1, step: 0.01, value: [0, 1], unit: "mg/m3" },
                    color: function (co) {
                        var colorString = this.colorScale(co);
                        var rgbcolor = new Cesium.Color.fromCssColorString(colorString);
                        var alpha = this.alphaScale(co);
                        var rgbacolor = new Cesium.Color.fromAlpha(rgbcolor, alpha);
                        return rgbacolor;
                    },
                    alphaScale: d3.scale.linear().domain([0, 0.1, 0.8]).range([0, 0.5, 1]),
                    colorScale: d3.scale.linear()
                        .domain([0, 0.05, 0.1, 0.3, 0.5, 0.6, 0.8, 1])
                        .range(["#1e90ff", "#00ff00", "#ffff00", "#ff9900", "#ff0000", "#4c1130", "#312129", "#000000"])
                });
            }
        },
        "o3": {
            matches: _.matches({ overlayType: "o3" }),
            create: function (attr) {
                return buildProduct({
                    type: "o3",
                    description: "臭氧",
                    levelNum: 15,
                    units: [
                        { label: "µg/m3", conversion: function (x) { return x; } }
                    ],
                    valueRange: { min: 60, max: 800, step: 10, value: [20, 800], unit: "µg/m3" },
                    color: function (o3) {
                        var colorString = this.colorScale(o3);
                        var rgbcolor = new Cesium.Color.fromCssColorString(colorString);
                        var alpha = this.alphaScale(o3);
                        var rgbacolor = new Cesium.Color.fromAlpha(rgbcolor, alpha);
                        return rgbacolor;
                    },
                    alphaScale: d3.scale.linear().domain([0, 100, 800]).range([0, 0.5, 1]),
                    colorScale: d3.scale.linear()
                        .domain([0, 100, 180, 300, 450, 600, 800])
                        .range(["#1e90ff", "#00ff00", "#ffff00", "#ff9900", "#ff0000", "#4c1130", "#312129"])
                });
            }
        },
        "pm2_5": {
            matches: _.matches({ overlayType: "pm2_5" }),
            create: function (attr) {
                return buildProduct({
                    type: "pm2_5",
                    description: "PM2.5",
                    levelNum: 30,
                    units: [
                        { label: "µg/m3", conversion: function (x) { return x; } }
                    ],
                    valueRange: { min: 30, max: 600, step: 5, value: [30, 400], unit: "µg/m3" },
                    color: function (pm) {
                        var colorString = this.colorScale(pm)
                        var rgbcolor = new Cesium.Color.fromCssColorString(colorString);
                        var alpha = this.alphaScale(pm);
                        var rgbacolor = new Cesium.Color.fromAlpha(rgbcolor, alpha);
                        return rgbacolor;
                    },
                    alphaScale: d3.scale.linear().domain([0, 50, 500]).range([0, 0.5, 1]),
                    colorScale: d3.scale.linear()
                        .domain([0, 50, 100, 200, 300, 400, 500, 1000])
                        .range(["#1e90ff", "#00ff00", "#ffff00", "#ff9900", "#ff0000", "#4c1130", "#312129", "#000000"])
                });
            }
        },
        "pm10": {
            matches: _.matches({ overlayType: "pm10" }),
            create: function (attr) {
                return buildProduct({
                    type: "pm10",
                    description: "PM10",
                    levelNum: 15,
                    units: [
                        { label: "µg/m3", conversion: function (x) { return x; } }
                    ],
                    valueRange: { min: 30, max: 600, step: 5, value: [30, 500], unit: "µg/m3" },
                    color: function (pm) {
                        var colorString = this.colorScale(pm)
                        var rgbcolor = new Cesium.Color.fromCssColorString(colorString);
                        var alpha = this.alphaScale(pm);
                        var rgbacolor = new Cesium.Color.fromAlpha(rgbcolor, alpha);
                        return rgbacolor;
                    },
                    alphaScale: d3.scale.linear().domain([0, 50, 500]).range([0, 0.5, 1]),
                    colorScale: d3.scale.linear()
                        .domain([0, 50, 100, 200, 300, 400, 500, 1000])
                        .range(["#1e90ff", "#00ff00", "#ffff00", "#ff9900", "#ff0000", "#4c1130", "#312129", "#000000"])
                });
            }
        }
    };

    //根据图层名称返回图层的构造
    function productsFor(attributes) {
        var attr = _.clone(attributes), result;
        _.values(FACTORIES).forEach(function (factory) {
            if (factory.matches(attr)) {
                result = factory.create(attr);
            }
        });
        return result;
    }
    //最后返回的是工厂模式的处理
    return {
        setServerAddr: setServerAddr,
        overlayTypes: d3.set(_.keys(FACTORIES)),
        productsFor: productsFor
    };
}();
