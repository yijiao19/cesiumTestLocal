var colortable = function () {//标准色谱定义
    var colorMap = {
        jet: {
            "domain": [0, 0.125, 0.375, 0.625, 0.875, 1],
            "range": ["#000083", "#003caa", "#05ffff", "#ffff00", "#fa0000", "#800000"]
        },
        hsv: {
            "domain": [0, 0.169, 0.173, 0.337, 0.341, 0.506, 0.671, 0.675, 0.839, 0.843, 1],
            "range": ["#ff0000", "#fdff02", "#f7ff02", "#00fc04", "#00fc0a", "#01f9ff", "#0200fd", "#0800fd", "#ff00fb", "#ff00f5", "#ff0006"]
        },
        rainbow: {
            "domain": [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
            "range": ["#96005a", "#0000c8", "#0019ff", "#0098ff", "#2cff96", "#97ff00", "#ffea00", "#ff6f00", "#ff0000"]
        },
        portland: {
            "domain": [0, 0.25, 0.5, 0.75, 1],
            "range": ["#0c3383", "#0a88ba", "#f2d338", "#f28f38", "#d91e1e"]
        },
        earth: {
            "domain": [0, 0.1, 0.2, 0.4, 0.6, 1],
            "range": ["#000082", "#00b4b4", "#28d228", "#e6e632", "#784614", "#ffffff"]
        },
        "rainbow-soft": {
            "domain": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
            "range": ["#7d00b3", "#c700b4", "#ff0079", "#ff6c00", "#dec200", "#96ff00", "#00ff37", "#00f696", "#32a7de", "#6733eb", "#7c00ba"]
        },
        phase: {
            "domain": [0, 0.13, 0.25, 0.38, 0.5, 0.63, 0.75, 0.88, 1],
            "range": ["#916912", "#b84726", "#ba3a73", "#a047b9", "#6e61da", "#327ba4", "#1f836e", "#4d8122", "#916912"]
        }
    }
    //获取所有的颜色名称
    function getColors(){
        var colors = new Array();
        for(var key in colorMap){
            colors.push(key);
        }
        return colors;
    }
    //根据色谱名称返回颜色比例尺
    function getColorScale(colorname) {
        if (!(colorname in colorMap)) {
            return null;
        }
        var colors = colorMap[colorname];
        var domain = colors.domain;
        var range = colors.range;
        return d3.scale.linear().domain(domain).range(range);
    }

    return {
        getColorScale: getColorScale,
        getColors : getColors
    }
}();
