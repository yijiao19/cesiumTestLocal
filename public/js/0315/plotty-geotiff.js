var xhr = new XMLHttpRequest();
xhr.open('GET', '/data/OUTPUT_PATH.tif', true);
xhr.responseType = 'arraybuffer';
xhr.onload = function (e) {
    var parser = GeoTIFF.parse(this.response);
    var image = parser.getImage();
    var plot;
    var colorscaleSelect = document.getElementById("ex1_colorscaleselect");
    for (var cm in plotty.colorscales) {
        var option = document.createElement("option");
        option.text = cm;
        option.value = cm;
        if (cm == "jet") option.selected = true;
        colorscaleSelect.add(option);
    }
    
    var inputMin = document.getElementById("ex1_min");
    var inputMax = document.getElementById("ex1_max");
    var clampLowBox = document.getElementById("ex1_clamp_low");
    var clampHighBox = document.getElementById("ex1_clamp_high");
    colorscaleSelect.onchange = function () {
        plot.setColorScale(this.value);
        plot.render();
    }
    inputMax.oninput = inputMin.oninput = function () {
        plot.setDomain([parseFloat(inputMin.value), parseFloat(inputMax.value)]);
        document.getElementById("ex1_min_label").innerHTML = inputMin.value;
        document.getElementById("ex1_max_label").innerHTML = inputMax.value;
        plot.render();
    };
    clampLowBox.onchange = clampHighBox.onchange = function () {
        plot.setClamp(clampLowBox.checked, clampHighBox.checked);
        plot.render();
    };

    var rasters = image.readRasters();
    var canvas = document.getElementById("ex1_canvas");
    plot = new plotty.plot({
        canvas: canvas, 
        data: rasters[0],
        width: image.getWidth(), 
        height: image.getHeight(),
        domain: [0, 0.05], 
        colorScale: colorscaleSelect.value
    });
    plot.render();
};
xhr.send();