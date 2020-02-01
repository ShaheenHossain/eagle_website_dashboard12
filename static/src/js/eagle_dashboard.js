eagle.define('eagle_website_dashboard.eagle_website_dashboard', function (require) {
    'use strict';

    var sAnimation = require('website.content.snippets.animation');
    var ajax = require('web.ajax');
    var core = require('web.core');
    var config = require('web.config');
    var Dialog = require('web.Dialog');
    var time = require('web.time');
    var QWeb = core.qweb;
    var _t = core._t;

    sAnimation.registry.snippet_dashboard_home_page = sAnimation.Class.extend({
        selector: '.eagle_dynamic_dashboard',
        widget: null,
        xmlDependencies: [
            '/eagle_dashboard/static/src/xml/eagle_dashboard_templates.xml',
            '/eagle_website_dashboard/static/src/xml/eagle_website_no_item_template.xml',
            '/eagle_dashboard/static/src/xml/eagle_dashboard_pro.xml'],
        events: {
            'click ul#eagle_date_selector_container li': '_ksOnDateFilterMenuSelect',
            'click .apply-dashboard-date-filter': '_onKsApplyDateFilter',
            'click .clear-dashboard-date-filter': '_onKsClearDateValues',
            'click #eagle_chart_canvas_id': 'onChartCanvasClick',
            'click .eagle_dashboard_item_drill_up': 'ksOnDrillUp',
        },

        _ksOnDateFilterMenuSelect: function (e) {
            if (e.target.id !== 'eagle_date_selector_container') {
                var eagle_self = this;
                _.each($('.eagle_date_filter_selected'), function ($filter_options) {
                    $($filter_options).removeClass("eagle_date_filter_selected")
                });
                $(e.target.parentElement).addClass("eagle_date_filter_selected");
                $('#eagle_date_filter_selection', this.$el).text(eagle_self.eagle_date_filter_selections[e.target.parentElement.id]);

                if (e.target.parentElement.id !== "l_custom") {
                    $('.eagle_date_input_fields').addClass("eagle_hide");
                    $('.eagle_date_filter_dropdown').removeClass("eagle_btn_first_child_radius");
                    e.target.parentElement.id === "l_none" ? eagle_self._onKsClearDateValues() : eagle_self._onKsApplyDateFilter();
                } else if (e.target.parentElement.id === "l_custom") {
                    $(".eagle_start_date_picker", eagle_self.$el).val(null).removeClass("eagle_hide");
                    $(".eagle_end_date_picker", eagle_self.$el).val(null).removeClass("eagle_hide");
                    $('.eagle_date_input_fields', eagle_self.$el).removeClass("eagle_hide");
                    $('.eagle_date_filter_dropdown', eagle_self.$el).addClass("eagle_btn_first_child_radius");
                    eagle_self.$el.find(".apply-dashboard-date-filter", eagle_self.$el).removeClass("eagle_hide");
                    eagle_self.$el.find(".clear-dashboard-date-filter", eagle_self.$el).removeClass("eagle_hide");
                }
            }
        },

        getContext: function () {
            var eagle_self = this;
            var context = {
                ksDateFilterSelection: eagle_self.ksDateFilterSelection,
                ksDateFilterStartDate: eagle_self.ksDateFilterStartDate,
                ksDateFilterEndDate: eagle_self.ksDateFilterEndDate,
            }
            return Object.assign(context,eagle.session_info.user_context)
        },

        _onKsApplyDateFilter: function () {
            var eagle_self = this;
            time
            var $target = eagle_self.$target;
            var dashboard_id = $target.attr('data-id')
            var start_date = eagle_self.$el.find(".eagle_start_date_picker").val();
            var end_date = eagle_self.$el.find(".eagle_end_date_picker").val();
            if (start_date === "Invalid date") {
                alert("Invalid Date is given in Start Date.")
            } else if (end_date === "Invalid date") {
                alert("Invalid Date is given in End Date.")
            } else if (eagle_self.$el.find('.eagle_date_filter_selected').attr('id') !== "l_custom") {

                eagle_self.ksDateFilterSelection = eagle_self.$el.find('.eagle_date_filter_selected').attr('id');

                $.when(eagle_self.eagle_fetch_data()).then(function () {
                    eagle_self.ksUpdateDashboardItem(Object.keys(eagle_self.config.eagle_item_data));
                });
            } else {
                if (start_date && end_date) {
                    if (start_date <= end_date) {

                        eagle_self.ksDateFilterSelection = eagle_self.$el.find('.eagle_date_filter_selected').attr('id');
                        eagle_self.ksDateFilterStartDate = moment(new Date(start_date)).toISOString();
                        eagle_self.ksDateFilterEndDate = moment(new Date(end_date)).toISOString();

                        $.when(eagle_self.eagle_fetch_data()).then(function () {
                            eagle_self.ksRenderDashboard($target, dashboard_id);
                        });

                    } else {
                        alert(_t("Start date should be less than end date"));
                    }
                } else {
                    alert(_t("Please enter start date and end date"));
                }
            }
        },

        ksUpdateDashboardItem : function (ids) {
            var eagle_self = this;
            for (var i=0;i<ids.length;i++){
                var item_data = eagle_self.config.eagle_item_data[ids[i]]
                eagle_self.grid.removeWidget(eagle_self.$el.find(".grid-stack-item[data-gs-id="+item_data.id+"]"));
                eagle_self.ksRenderDashboardItems([item_data]);
            }
            eagle_self.grid.setStatic(true);
        },

        eagle_fetch_data: function () {
            var eagle_self = this;
            eagle_self.dashboard_id = eagle_self.$target.attr('data-id');
            return ajax.jsonRpc('/dashboard/data', 'call', {
                model:  'eagle_dashboard.items',
                method: 'eagle_dashboard_data_handler',
                args: [],
                kwargs: {
                    'id': Number(eagle_self.dashboard_id)
                },
                context: eagle_self.getContext(),
            }).done(function (result) {
                eagle_self.config = result;
            }.bind(eagle_self));
        },

        _onKsClearDateValues: function () {
            var eagle_self = this;
            var $target = eagle_self.$target;
            var dashboard_id = $target.attr('data-id')
            var type = $target.attr('data-selection')

            eagle_self.ksDateFilterSelection = 'l_none';
            eagle_self.ksDateFilterStartDate = false;
            eagle_self.ksDateFilterEndDate = false;

           $.when(eagle_self.eagle_fetch_data()).then(function () {
                eagle_self.ksRenderDashboard($target, dashboard_id);
           });
        },

        init: function(parent, state, params) {
            this._super.apply(this, arguments);
            this.form_template = 'eagle_dashboard_template_view';
            this.gridstackConfig = {};
            var l10n = _t.database.parameters;
            this.eagle_date_filter_selections = {
                'l_none': 'Date Filter',
                'l_day': 'Today',
                't_week': 'This Week',
                't_month': 'This Month',
                't_quarter': 'This Quarter',
                't_year': 'This Year',
                'n_day': 'Next Day',
                'n_week': 'Next Week',
                'n_month': 'Next Month',
                'n_quarter': 'Next Quarter',
                'n_year': 'Next Year',
                'ls_day': 'Last Day',
                'ls_week': 'Last Week',
                'ls_month': 'Last Month',
                'ls_quarter': 'Last Quarter',
                'ls_year': 'Last Year',
                'l_week': 'Last 7 days',
                'l_month': 'Last 30 days',
                'l_quarter': 'Last 90 days',
                'l_year': 'Last 365 days',
                'l_custom': 'Custom Filter',
            };
            this.eagle_date_filter_selection_order = ['l_day', 't_week','t_month','t_quarter','t_year','n_day',
                    'n_week','n_month','n_quarter','n_year','ls_day','ls_week','ls_month','ls_quarter',
                    'ls_year','l_week','l_month', 'l_quarter','l_year','l_custom'];
            this.date_format = time.strftime_to_moment_format(_t.database.parameters.date_format)
            this.date_format = this.date_format.replace(/\bYY\b/g, "YYYY");
            this.datetime_format = time.strftime_to_moment_format((l10n.date_format + ' ' + l10n.time_format));
            this.file_type_magic_word = {
                '/': 'jpg',
                'R': 'gif',
                'i': 'png',
                'P': 'svg+xml',
            };
            this.grid = false;
            this.ksChartColorOptions = ['default', 'cool', 'warm', 'neon'];
            this.chart_container = {};
            this.gridstack_options = {
                staticGrid: true,
                float: false
            };
            this.ksDateFilterSelection = false;
            this.ksDateFilterStartDate = false;
            this.ksDateFilterEndDate = false;
        },

        start: function (dashboard_id, data_selection, eagle_self_received) {
            var eagle_self = this;
            if(dashboard_id == undefined){
                dashboard_id = 0;
            }
            if(data_selection == undefined){
                data_selection = eagle_self.$target.attr('data-selection');
            }
            if(eagle_self_received !== undefined){
                eagle_self.eagle_self_received = eagle_self_received;
                eagle_self.$el = eagle_self_received.$el;
                eagle_self.$target = eagle_self_received.$target;
                eagle_self.$target.attr('data-id', dashboard_id);
                eagle_self.$target.attr('data-selection', data_selection);
                eagle_self.$overlay = eagle_self_received.$overlay;
                eagle_self.data = eagle_self_received.data;
                this.$el = eagle_self_received.$target;
                this.$target = eagle_self_received.$target;
                this.$overlay = eagle_self_received.$overlay;
            }
            Chart.plugins.unregister(ChartDataLabels);
            eagle_self.eagle_set_default_chart_view();
            var dashboard_id = eagle_self.$target.attr('data-id');
            ajax.jsonRpc('/dashboard/data', 'call', {
                model:  'eagle_dashboard.items',
                method: 'eagle_dashboard_handler',
                args: [],
                kwargs: {
                    'id': Number(dashboard_id),
                    'type': data_selection
                }
            }).then(function (data) {
                if(!$.isEmptyObject(data)){
                    var $target = eagle_self.$target;
                    eagle_self.config = data;
                    eagle_self.eagle_set_update_interval();
                    eagle_self.ksRenderDashboard($target, dashboard_id);
                } else{
                    eagle_self._ksRenderNoItemView()
                }
            }.bind(eagle_self));
        },

        ksRenderDashboard: function ($target, dashboard_id) {
            var eagle_self = this;
            eagle_self.$el = $target.empty();
            var type = $target.attr('data-selection')
            eagle_self.$el.addClass('eagle_dashboard d-flex flex-column eagle_dashboard_identifier_' + dashboard_id + '_' + type);
            var $eagle_header = $(QWeb.render('ksDashboardNinjaHeader', {
                eagle_dashboard_name: eagle_self.config.name,
                eagle_dashboard_manager: eagle_self.config.eagle_dashboard_manager,
                date_selection_data: eagle_self.eagle_date_filter_selections,
                date_selection_order: eagle_self.eagle_date_filter_selection_order
            }));

            if (!config.device.isMobile) {
                $eagle_header.addClass("eagle_dashboard_header_sticky")
            }

            eagle_self.$el.append($eagle_header);

            eagle_self.ksRenderDashboardMainContent();
        },

        ksSortItems: function(eagle_item_data){
            var items = []
            var eagle_self = this;
            var item_data = Object.assign({}, eagle_item_data);
            if (eagle_self.config.eagle_gridstack_config) {
               eagle_self.gridstackConfig = JSON.parse(eagle_self.config.eagle_gridstack_config);
               var a = Object.values(eagle_self.gridstackConfig);
               var b = Object.keys(eagle_self.gridstackConfig);
               for(var i = 0; i<a.length;i++ ){
                   a[i]['id'] = b[i];
               }
               a.sort(function(a,b){
                   return (35*a.y+a.x) - (35*b.y+b.x);
               });
               for (var i = 0; i < a.length; i++)
               {
                   if(item_data[a[i]['id']]){
                        items.push(item_data[a[i]['id']]);
                        delete item_data[a[i]['id']];
                   }
               }
            }

            return items.concat(Object.values(item_data));
        },

        ksRenderDashboardMainContent: function () {
            var eagle_self = this;
            if (eagle_self.config.eagle_item_data) {
                eagle_self._renderDateFilterDatePicker();
                $('.eagle_dashboard_items_list', this.$el).remove();
                var $dashboard_body_container = $(QWeb.render('eagle_main_body_container'))
                var $gridstackContainer = $dashboard_body_container.find(".grid-stack");
                $dashboard_body_container.appendTo(eagle_self.$el)
                $gridstackContainer.gridstack(eagle_self.gridstack_options);
                eagle_self.grid = $gridstackContainer.data('gridstack');
                var items = eagle_self.ksSortItems(eagle_self.config.eagle_item_data);

                eagle_self.ksRenderDashboardItems(items);

                // In gridstack version 0.3 we have to make static after adding element in dom
                eagle_self.grid.setStatic(true);

            } else if (!eagle_self.config.eagle_item_data) {
                eagle_self.$el.find('.eagle_dashboard_link').addClass("eagle_hide");
                eagle_self._ksRenderNoItemView();
            }
        },

        _ksRenderNoItemView: function () {
            var eagle_self = this;
            $('.eagle_dashboard_items_list', eagle_self.$el).remove();
            ajax.jsonRpc('/check/user', 'call', {
                model:  'eagle_dashboard.board',
                method: 'eagle_check_user_login',
                args: [],
                kwargs: {},
            }).then(function(result){
                if(result){
                    $(QWeb.render('ksWebsiteNoItemView')).appendTo(eagle_self.$el)
                } else{
                    $(QWeb.render('ksWebsiteNoItemNoUserView')).appendTo(eagle_self.$el)
                }
            }.bind(this));

        },

        ksRenderDashboardItems: function (items) {
            var eagle_self = this;
            eagle_self.$el.find('.print-dashboard-btn').addClass("eagle_pro_print_hide");

            if (eagle_self.config.eagle_gridstack_config) {
                eagle_self.gridstackConfig = JSON.parse(eagle_self.config.eagle_gridstack_config);
            }
            var item_view;
            var eagle_container_class = 'grid-stack-item',
                eagle_inner_container_class = 'grid-stack-item-content';
            for (var i = 0; i < items.length; i++) {
                if(eagle_self.grid){
                    if (items[i].eagle_dashboard_item_type === 'eagle_tile') {
                        eagle_self._ksRenderDashboardTile(items[i], eagle_container_class, eagle_inner_container_class)
                    } else if (items[i].eagle_dashboard_item_type === 'eagle_list_view') {
                        eagle_self._renderListView(items[i], eagle_self.grid)
                    } else if (items[i].eagle_dashboard_item_type === 'eagle_kpi') {
                         eagle_self.renderKpi(items[i], eagle_self.grid)
                    } else {
                        eagle_self._renderGraph(items[i], eagle_self.grid)
                    }
                }
            }
        },

        _eagle_get_rgba_format: function (val) {
            var rgba = val.split(',')[0].match(/[A-Za-z0-9]{2}/g);
            rgba = rgba.map(function (v) {
                return parseInt(v, 16)
            }).join(",");
            return "rgba(" + rgba + "," + val.split(',')[1] + ")";
        },

        ksNumFormatter: function (num, digits) {
            var negative;
            var si = [{
                    value: 1,
                    symbol: ""
                },
                {
                    value: 1E3,
                    symbol: "k"
                },
                {
                    value: 1E6,
                    symbol: "M"
                },
                {
                    value: 1E9,
                    symbol: "G"
                },
                {
                    value: 1E12,
                    symbol: "T"
                },
                {
                    value: 1E15,
                    symbol: "P"
                },
                {
                    value: 1E18,
                    symbol: "E"
                }
            ];
            if(num<0){
                num = Math.abs(num)
                negative = true
            }
            var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
            var i;
            for (i = si.length - 1; i > 0; i--) {
                if (num >= si[i].value) {
                    break;
                }
            }
            if(negative){
                return "-" +(num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
            }else{
                return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
            }
        },

        _renderGraph: function (item, grid) {
            var eagle_self = this;
            var chart_data = JSON.parse(item.eagle_chart_data);
            var isDrill = item.isDrill ? item.isDrill : false;
            var chart_id = item.id,
                chart_title = item.name;
            var chart_title = item.name;
            var chart_type = item.eagle_dashboard_item_type.split('_')[1];
            switch (chart_type) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    var chart_family = "circle";
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                case "area":
                    var chart_family = "square"
                    break;
                default:
                    var chart_family = "none";
                    break;

            }

            var $eagle_gridstack_container = $(QWeb.render('eagle_gridstack_container', {
                eagle_chart_title: chart_title,
                ksIsDashboardManager: eagle_self.config.eagle_dashboard_manager,
                eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                chart_id: chart_id,
                chart_family: chart_family,
                chart_type: chart_type,
                ksChartColorOptions: this.ksChartColorOptions,
                isdrill: isDrill,
            })).addClass('eagle_dashboarditem_id');
            $eagle_gridstack_container.find('.eagle_li_' + item.eagle_chart_item_color).addClass('eagle_date_filter_selected');

            var $ksChartContainer = $('<canvas id="eagle_chart_canvas_id" data-chart-id='+chart_id+'/>');
            $eagle_gridstack_container.find('.card-body').append($ksChartContainer);

            item.$el = $eagle_gridstack_container;
            if (chart_id in eagle_self.gridstackConfig) {
                grid.addWidget($eagle_gridstack_container, eagle_self.gridstackConfig[chart_id].x, eagle_self.gridstackConfig[chart_id].y, eagle_self.gridstackConfig[chart_id].width, eagle_self.gridstackConfig[chart_id].height, false, 11, null, 3, null, chart_id);
            } else {
                grid.addWidget($eagle_gridstack_container, 0, 0, 13, 4, true, 11, null, 3, null, chart_id);
            }

            if(chart_family === "circle"){
                if (chart_data && chart_data['labels'].length > 30){
                    $eagle_gridstack_container.find(".eagle_dashboard_color_option").remove();
                    $eagle_gridstack_container.find(".card-body").empty().append($("<div style='font-size:20px;'>Too many records for selected Chart Type. Consider using <strong>Domain</strong> to filter records or <strong>Record Limit</strong> to limit the no of records under <strong>30.</strong>"));
                    return ;
                }
            }

            if(chart_data["eagle_show_second_y_scale"] && item.eagle_dashboard_item_type === 'eagle_bar_chart'){
                var scales  = {}
                scales.yAxes = [
                    {
                        type: "linear",
                        display: true,
                        position: "left",
                        id: "y-axis-0",
                        gridLines:{
                            display: true
                        },
                        labels: {
                            show:true,
                        }
                    },
                    {
                        type: "linear",
                        display: true,
                        position: "right",
                        id: "y-axis-1",
                        labels: {
                            show:true,
                        },
                        ticks: {
                            beginAtZero: true,
                            callback : function(value, index, values){
                                return eagle_self.ksNumFormatter(value,1);
                            },
                        }
                    }
                ]

            }
            var chart_plugin = [];
            if (item.eagle_show_data_value) {
                chart_plugin.push(ChartDataLabels);
            }
            var ksMyChart = new Chart($ksChartContainer[0], {
                type: chart_type === "area" ? "line" : chart_type,
                plugins: chart_plugin,
                data: {
                    labels: chart_data['labels'],
                    groupByIds:chart_data['groupByIds'],
                    domains:chart_data['domains'],
                    datasets: chart_data.datasets,
                },
                options: {
                    maintainAspectRatio: false,
                    responsiveAnimationDuration: 1000,
                    animation: {
                        easing: 'easeInQuad',
                    },
                    scales: scales,
                    layout: {
                        padding: {
                            bottom: 0,
                        }
                    },
                    plugins: {
                        datalabels: {
                            backgroundColor: function(context) {
                                return context.dataset.backgroundColor;
                            },
                            borderRadius: 4,
                            color: 'white',
                            font: {
                                weight: 'bold'
                            },
                            anchor: 'center',
                            display: 'auto',
                            clamp: true,
                            formatter : function(value, ctx) {
                                let sum = 0;
                                let dataArr = ctx.dataset.data;
                                dataArr.map(data => {
                                    sum += data;
                                });
                                let percentage = sum === 0 ? 0 + "%" : (value*100 / sum).toFixed(2)+"%";
                                return percentage;
                            },
                        },
                    },

                }
            });

            this.chart_container[chart_id] = ksMyChart;
            if(chart_data && chart_data["datasets"].length>0) eagle_self.ksChartColors(item.eagle_chart_item_color, ksMyChart, chart_type, chart_family,item.eagle_bar_chart_stacked,item.eagle_semi_circle_chart,item.eagle_show_data_value);
        },

        ksChartColors: function (palette, ksMyChart, ksChartType, ksChartFamily,stack, semi_circle,eagle_show_data_value) {
            var eagle_self = this;
            var currentPalette = "cool";
            if (!palette) palette = currentPalette;
            currentPalette = palette;

            /*Gradients
              The keys are percentage and the values are the color in a rgba format.
              You can have as many "color stops" (%) as you like.
              0% and 100% is not optional.*/
            var gradient;
            switch (palette) {
                case 'cool':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [220, 237, 200, 1],
                        45: [66, 179, 213, 1],
                        65: [26, 39, 62, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;
                case 'warm':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [254, 235, 101, 1],
                        45: [228, 82, 27, 1],
                        65: [77, 52, 47, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;
                case 'neon':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [255, 236, 179, 1],
                        45: [232, 82, 133, 1],
                        65: [106, 27, 154, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;

                case 'default':
                    var color_set = ['#F04F65', '#f69032', '#fdc233', '#53cfce', '#36a2ec', '#8a79fd', '#b1b5be', '#1c425c', '#8c2620', '#71ecef', '#0b4295', '#f2e6ce', '#1379e7']
            }

            //Find datasets and length
            var chartType = ksMyChart.config.type;
            switch (chartType) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    var datasets = ksMyChart.config.data.datasets[0];
                    var setsCount = datasets.data.length;
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                    var datasets = ksMyChart.config.data.datasets;
                    var setsCount = datasets.length;
                    break;
            }

            //Calculate colors
            var chartColors = [];

            if (palette !== "default") {
                //Get a sorted array of the gradient keys
                var gradientKeys = Object.keys(gradient);
                gradientKeys.sort(function (a, b) {
                    return +a - +b;
                });
                for (var i = 0; i < setsCount; i++) {
                    var gradientIndex = (i + 1) * (100 / (setsCount + 1)); //Find where to get a color from the gradient
                    for (var j = 0; j < gradientKeys.length; j++) {
                        var gradientKey = gradientKeys[j];
                        if (gradientIndex === +gradientKey) { //Exact match with a gradient key - just get that color
                            chartColors[i] = 'rgba(' + gradient[gradientKey].toString() + ')';
                            break;
                        } else if (gradientIndex < +gradientKey) { //It's somewhere between this gradient key and the previous
                            var prevKey = gradientKeys[j - 1];
                            var gradientPartIndex = (gradientIndex - prevKey) / (gradientKey - prevKey); //Calculate where
                            var color = [];
                            for (var k = 0; k < 4; k++) { //Loop through Red, Green, Blue and Alpha and calculate the correct color and opacity
                                color[k] = gradient[prevKey][k] - ((gradient[prevKey][k] - gradient[gradientKey][k]) * gradientPartIndex);
                                if (k < 3) color[k] = Math.round(color[k]);
                            }
                            chartColors[i] = 'rgba(' + color.toString() + ')';
                            break;
                        }
                    }
                }
            } else {
                for (var i = 0, counter = 0; i < setsCount; i++, counter++) {
                    if (counter >= color_set.length) counter = 0; // reset back to the beginning

                    chartColors.push(color_set[counter]);
                }

            }

            var datasets = ksMyChart.config.data.datasets;
            var options = ksMyChart.config.options;

            options.legend.labels.usePointStyle = true;
            if (ksChartFamily == "circle") {
                if(eagle_show_data_value){
                    options.legend.position = 'bottom';
                    options.layout.padding.top = 10;
                    options.layout.padding.bottom = 20;
                    options.layout.padding.left = 20;
                    options.layout.padding.right = 20;
                }else{
                    options.legend.position = 'top';
                }

                options.plugins.datalabels.align = 'center';
                options.plugins.datalabels.anchor = 'end';
                options.plugins.datalabels.borderColor = 'white';
                options.plugins.datalabels.borderRadius = 25;
                options.plugins.datalabels.borderWidth = 2;
                options.plugins.datalabels.clamp = true;
                options.plugins.datalabels.clip = false;

                options.tooltips.callbacks = {
                    title: function(tooltipItem, data) {
                        var k_amount = data.datasets[tooltipItem[0].datasetIndex]['data'][tooltipItem[0].index];
                        return data.datasets[tooltipItem[0].datasetIndex]['label']+" : " + k_amount;
                    },
                    label : function(tooltipItem, data) {
                        return data.labels[tooltipItem.index];
                    },
                }
                for (var i = 0; i < datasets.length; i++) {
                    datasets[i].backgroundColor = chartColors;
                    datasets[i].borderColor = "rgba(255,255,255,1)";
                }
                if(semi_circle && (chartType === "pie" || chartType === "doughnut")){
                    options.rotation = 1*Math.PI;
                    options.circumference = 1*Math.PI;
                }
            } else if (ksChartFamily == "square") {
                options.scales.xAxes[0].gridLines.display = false;
                options.scales.yAxes[0].ticks.beginAtZero = true;

                options.plugins.datalabels.align = 'end';

                options.plugins.datalabels.formatter = function(value, ctx) {
                    return eagle_self.ksNumFormatter(value,1);
                };

                if(chartType==="line"){
                    options.plugins.datalabels.backgroundColor= function(context) {
                        return context.dataset.borderColor;
                    };
                }

                if(chartType === "horizontalBar"){
                    options.scales.xAxes[0].ticks.callback = function(value,index,values){
                        return eagle_self.ksNumFormatter(value,1);
                    }
                    options.scales.xAxes[0].ticks.beginAtZero = true;
                }
                else{
                    options.scales.yAxes[0].ticks.callback = function(value,index,values){
                        return eagle_self.ksNumFormatter(value,1);
                    }
                }

                options.tooltips.callbacks = {
                    label: function(tooltipItem, data) {
                        var k_amount = data.datasets[tooltipItem.datasetIndex]['data'][tooltipItem.index];
                        return data.datasets[tooltipItem.datasetIndex]['label']+" : " + k_amount;
                    }
                }

                for (var i = 0; i < datasets.length; i++) {
                    switch (ksChartType) {
                        case "bar":
                        case "horizontalBar":
                            if (datasets[i].type && datasets[i].type=="line"){
                                datasets[i].borderColor = chartColors[i];
                                datasets[i].backgroundColor = "rgba(255,255,255,0)";
                                datasets[i]['datalabels'] = {
                                    backgroundColor: chartColors[i],
                                }
                            }
                            else{
                                datasets[i].backgroundColor = chartColors[i];
                                datasets[i].borderColor = "rgba(255,255,255,0)";
                                options.scales.xAxes[0].stacked = stack;
                                options.scales.yAxes[0].stacked = stack;
                            }
                            break;
                        case "line":
                            datasets[i].borderColor = chartColors[i];
                            datasets[i].backgroundColor = "rgba(255,255,255,0)";
                            break;
                        case "area":
                            datasets[i].borderColor = chartColors[i];
                            break;
                    }
                }
            }
            ksMyChart.update();
        },

        _renderDateFilterDatePicker: function () {
            var eagle_self = this;
            //Show Print option cause items are present.
            eagle_self.$el.find(".eagle_dashboard_link").removeClass("eagle_hide");
            if($('#eagle_date_filter_selection', this.$el) == 'l_custom'){
                eagle_self.$el.find('.eagle_date_input_fields', this.$el).append('<input type="text" class="eagle_start_date_picker" placeholder="Start Date"></input>')
                eagle_self.$el.find('.eagle_date_input_fields', this.$el).append('<input type="text" class="eagle_end_date_picker" placeholder="End Date"></input>')
            } else{
                eagle_self.$el.find('.eagle_date_input_fields', this.$el).append('<input type="text" class="eagle_start_date_picker" placeholder="Start Date"></input>')
                eagle_self.$el.find('.eagle_date_input_fields', this.$el).append('<input type="text" class="eagle_end_date_picker" placeholder="End Date"></input>')
            }

            //Initialization of the date picker with on-select event
            // TODO Need to fix datetime picker:
//            var datepickersOptions = {
//                minDate: moment({y: 1900}),
//                maxDate: moment().add(200, 'y'),
//                calendarWeeks: true,
//                icons : {
//                    time: 'fa fa-clock-o',
//                    date: 'fa fa-calendar',
//                    next: 'fa fa-chevron-right',
//                    previous: 'fa fa-chevron-left',
//                    up: 'fa fa-chevron-up',
//                    down: 'fa fa-chevron-down',
//                },
//                locale : moment.locale(),
//                format : time.getLangDatetimeFormat(),
//                widgetPositioning : {
//                    horizontal: 'auto',
//                    vertical: 'top',
//                },
//                 widgetParent: 'body',
//            };
//            eagle_self.$el.find(".eagle_start_date_picker", eagle_self.$el).datetimepicker(datepickersOptions);
            eagle_self.$el.find(".eagle_start_date_picker", eagle_self.$el).datepicker({
                dateFormat: "yy/mm/dd",
                altFormat: "yy-mm-dd",
                altField: "#ksActualStartDateToStore",
                changeMonth: true,
                changeYear: true,
                language: moment.locale(),
                onSelect: function (eagle_start_date) {
                    eagle_self.$el.find(".eagle_start_date_picker").val(moment(new Date(eagle_start_date)).format(eagle_self.datetime_format));
                    eagle_self.$el.find(".apply-dashboard-date-filter", eagle_self.$el).removeClass("eagle_hide");
                    eagle_self.$el.find(".clear-dashboard-date-filter", eagle_self.$el).removeClass("eagle_hide");
                },
            });

            eagle_self.$el.find(".eagle_end_date_picker", eagle_self.$el).datepicker({
                dateFormat: "yy/mm/dd",
                altFormat: "yy-mm-dd",
                altField: "#ksActualEndDateToStore",
                changeMonth: true,
                changeYear: true,
                language: moment.locale(),
                onSelect: function (eagle_end_date) {
                    eagle_self.$el.find(".eagle_end_date_picker").val(moment(new Date(eagle_end_date)).format(eagle_self.datetime_format));
                    eagle_self.$el.find(".apply-dashboard-date-filter", eagle_self.$el).removeClass("eagle_hide");
                    eagle_self.$el.find(".clear-dashboard-date-filter", eagle_self.$el).removeClass("eagle_hide");
                },
            });
            eagle_self._KsGetDateValues();
        },

        eagle_set_update_interval : function(){
            var self = this;
            if (self.config.eagle_item_data){
                self.ksUpdateDashboard = {};
                Object.keys(self.config.eagle_item_data).forEach(function (item_id){
                    var updateValue = self.config.eagle_item_data[item_id]["eagle_update_items_data"];
                    if (updateValue){
                        var ksItemUpdateInterval = setInterval(function(){self.ksFetchUpdateItem(item_id)}, updateValue);
                        self.ksUpdateDashboard[item_id] = ksItemUpdateInterval;
                    }
                });
            }
        },

        eagle_remove_update_interval : function(){
            var self = this;
            if (self.ksUpdateDashboard){
                Object.values(self.ksUpdateDashboard).forEach(function(itemInterval){
                    clearInterval(itemInterval);
                });
            }
        },

        _KsGetDateValues: function () {
            var self = this;

            //Setting Date Filter Selected Option in Date Filter DropDown Menu
            var date_filter_selected = self.config.eagle_date_filter_selection;
            self.$el.find('#' + date_filter_selected).addClass("eagle_date_filter_selected");
            self.$el.find('#eagle_date_filter_selection').text(self.eagle_date_filter_selections[date_filter_selected]);
            self.ksDateFilterSelection = self.config.eagle_date_filter_selection

            if (self.config.eagle_date_filter_selection === 'l_custom') {
                self.$el.find('.eagle_date_input_fields').removeClass("eagle_hide");
                self.$el.find('.eagle_date_filter_dropdown').addClass("eagle_btn_first_child_radius");
            } else if (self.config.eagle_date_filter_selection !== 'l_custom') {
                self.$el.find('.eagle_date_input_fields').addClass("eagle_hide");
            }
        },

        eagle_get_dark_color: function (color, opacity, percent) {
            var num = parseInt(color.slice(1), 16),
                amt = Math.round(2.55 * percent),
                R = (num >> 16) + amt,
                G = (num >> 8 & 0x00FF) + amt,
                B = (num & 0x0000FF) + amt;
            return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1) + "," + opacity;
        },

        _ksRenderDashboardTile: function (tile, eagle_container_class, eagle_inner_container_class) {
            var eagle_self = this;
            var eagle_icon_url, item_view;
            var eagle_rgba_background_color, eagle_rgba_font_color, eagle_rgba_default_icon_color;
            var style_main_body, style_image_body_l2, style_domain_count_body, style_button_customize_body,
                style_button_delete_body;

            var data_count = eagle_self.ksNumFormatter(tile.eagle_record_count, 1);
            if (tile.eagle_icon_select == "Custom") {
                if (tile.eagle_icon[0]) {
                    eagle_icon_url = 'data:image/' + (eagle_self.file_type_magic_word[tile.eagle_icon[0]] || 'png') + ';base64,' + tile.eagle_icon;
                } else {
                    eagle_icon_url = false;
                }
            }

            tile.ksIsDashboardManager = eagle_self.config.eagle_dashboard_manager;
            eagle_rgba_background_color = eagle_self._eagle_get_rgba_format(tile.eagle_background_color);
            eagle_rgba_font_color = eagle_self._eagle_get_rgba_format(tile.eagle_font_color);
            eagle_rgba_default_icon_color = eagle_self._eagle_get_rgba_format(tile.eagle_default_icon_color);
            style_main_body = "background-color:" + eagle_rgba_background_color + ";color : " + eagle_rgba_font_color + ";";
            switch (tile.eagle_layout) {
                case 'layout1':
                    item_view = QWeb.render('eagle_dashboard_item_layout1', {
                        item: tile,
                        style_main_body: style_main_body,
                        eagle_icon_url: eagle_icon_url,
                        eagle_rgba_default_icon_color: eagle_rgba_default_icon_color,
                        eagle_container_class: eagle_container_class,
                        eagle_inner_container_class: eagle_inner_container_class,
                        eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                        data_count: data_count
                    });
                    break;

                case 'layout2':
                    var eagle_rgba_dark_background_color_l2 = eagle_self._eagle_get_rgba_format(eagle_self.eagle_get_dark_color(tile.eagle_background_color.split(',')[0], tile.eagle_background_color.split(',')[1], -10));
                    style_image_body_l2 = "background-color:" + eagle_rgba_dark_background_color_l2 + ";";
                    item_view = QWeb.render('eagle_dashboard_item_layout2', {
                        item: tile,
                        style_image_body_l2: style_image_body_l2,
                        style_main_body: style_main_body,
                        eagle_icon_url: eagle_icon_url,
                        eagle_rgba_default_icon_color: eagle_rgba_default_icon_color,
                        eagle_container_class: eagle_container_class,
                        eagle_inner_container_class: eagle_inner_container_class,
                        eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                        data_count: data_count

                    });
                    break;

                case 'layout3':
                    item_view = QWeb.render('eagle_dashboard_item_layout3', {
                        item: tile,
                        style_main_body: style_main_body,
                        eagle_icon_url: eagle_icon_url,
                        eagle_rgba_default_icon_color: eagle_rgba_default_icon_color,
                        eagle_container_class: eagle_container_class,
                        eagle_inner_container_class: eagle_inner_container_class,
                        eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                        data_count: data_count

                    });
                    break;

                case 'layout4':
                    style_main_body = "color : " + eagle_rgba_font_color + ";border : solid;border-width : 1px;border-color:" + eagle_rgba_background_color + ";"
                    style_image_body_l2 = "background-color:" + eagle_rgba_background_color + ";";
                    style_domain_count_body = "color:" + eagle_rgba_background_color + ";";
                    item_view = QWeb.render('eagle_dashboard_item_layout4', {
                        item: tile,
                        style_main_body: style_main_body,
                        style_image_body_l2: style_image_body_l2,
                        style_domain_count_body: style_domain_count_body,
                        eagle_icon_url: eagle_icon_url,
                        eagle_rgba_default_icon_color: eagle_rgba_default_icon_color,
                        eagle_container_class: eagle_container_class,
                        eagle_inner_container_class: eagle_inner_container_class,
                        eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                        data_count: data_count

                    });
                    break;

                case 'layout5':
                    item_view = QWeb.render('eagle_dashboard_item_layout5', {
                        item: tile,
                        style_main_body: style_main_body,
                        eagle_icon_url: eagle_icon_url,
                        eagle_rgba_default_icon_color: eagle_rgba_default_icon_color,
                        eagle_container_class: eagle_container_class,
                        eagle_inner_container_class: eagle_inner_container_class,
                        eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                        data_count: data_count

                    });
                    break;

                case 'layout6':
                    eagle_rgba_default_icon_color = eagle_self._eagle_get_rgba_format(tile.eagle_default_icon_color);
                    item_view = QWeb.render('eagle_dashboard_item_layout6', {
                        item: tile,
                        style_image_body_l2: style_image_body_l2,
                        style_main_body: style_main_body,
                        eagle_icon_url: eagle_icon_url,
                        eagle_rgba_default_icon_color: eagle_rgba_default_icon_color,
                        eagle_container_class: eagle_container_class,
                        eagle_inner_container_class: eagle_inner_container_class,
                        eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                        data_count: data_count

                    });
                    break;

                default:
                    item_view = QWeb.render('eagle_dashboard_item_layout_default', {
                        item: tile
                    });
                    break;
            }

            tile.$el = $(item_view);
            if (tile.id in eagle_self.gridstackConfig) {
                eagle_self.grid.addWidget($(item_view), eagle_self.gridstackConfig[tile.id].x, eagle_self.gridstackConfig[tile.id].y, eagle_self.gridstackConfig[tile.id].width, eagle_self.gridstackConfig[tile.id].height, false, 6, null, 2, 2, tile.id);
            } else {
                eagle_self.grid.addWidget($(item_view), 0, 0, 8, 2, true, 6, null, 2, 2, tile.id);
            }
        },

        renderKpi : function(item, grid){
            var eagle_self = this;
            var field =  item;
            var eagle_date_filter_selection = field.eagle_date_filter_selection;
            if (field.eagle_date_filter_selection==="l_none") eagle_date_filter_selection = eagle_self.config.eagle_date_filter_selection;
            var eagle_valid_date_selection = ['l_day','t_week','t_month','t_quarter','t_year'];
            var kpi_data = JSON.parse(field.eagle_kpi_data);
            var count_1 = kpi_data[0].record_data;
            var count_2 = kpi_data[1]?kpi_data[1].record_data: undefined;
            var target_1 = kpi_data[0].target;
            var target_view = field.eagle_target_view,
                pre_view =  field.eagle_prev_view;
            var eagle_rgba_background_color = eagle_self._eagle_get_rgba_format(field.eagle_background_color);
            var eagle_rgba_font_color = eagle_self._eagle_get_rgba_format(field.eagle_font_color)
            if(field.eagle_goal_enable){
                var diffrence = 0.0
                diffrence = count_1 - target_1
                var acheive = diffrence>=0 ? true : false;
                diffrence =  Math.abs(diffrence);
                var deviation = Math.round((diffrence/target_1)*100)
                if (deviation!==Infinity)  deviation = deviation? deviation + '%' : 0 + '%';
            }
            if(field.eagle_previous_period && eagle_valid_date_selection.indexOf(eagle_date_filter_selection)>=0){
                var previous_period_data = kpi_data[0].previous_period;
                var pre_diffrence = (count_1 - previous_period_data);
                var pre_acheive = pre_diffrence>0 ? true : false;
                pre_diffrence = Math.abs(pre_diffrence);
                var pre_deviation = previous_period_data ? parseInt((pre_diffrence/previous_period_data)*100) + '%' : "100%"
            }
            var item = {
                ksIsDashboardManager : eagle_self.config.eagle_dashboard_manager,
                id : field.id,
            }
            var eagle_icon_url;
            if (field.eagle_icon_select == "Custom") {
                if (field.eagle_icon[0]) {
                    eagle_icon_url = 'data:image/' + (eagle_self.file_type_magic_word[tile.eagle_icon[0]] || 'png') + ';base64,' + field.eagle_icon;
                } else {
                    eagle_icon_url = false;
                }
            }
            var eagle_rgba_icon_color = eagle_self._eagle_get_rgba_format(field.eagle_default_icon_color)
            var item_info = {
                item : item,
                id: field.id,
                count_1 : eagle_self.ksNumFormatter(kpi_data[0]['record_data'], 1),
                count_1_tooltip: kpi_data[0]['record_data'],
                count_2 : kpi_data[1] ? String(kpi_data[1]['record_data']):false ,
                name : field.name ? field.name : field.eagle_model_id.data.display_name,
                target_progress_deviation : Math.round((count_1/target_1)*100) ? String(Math.round((count_1/target_1)*100)):"0",
                icon_select : field.eagle_icon_select,
                default_icon: field.eagle_default_icon,
                icon_color: eagle_rgba_icon_color,
                target_deviation: deviation,
                target_arrow: acheive ? 'up':'down',
                eagle_enable_goal: field.eagle_goal_enable,
                eagle_previous_period: eagle_valid_date_selection.indexOf(eagle_date_filter_selection)>=0 ? field.eagle_previous_period: false,
                target: eagle_self.ksNumFormatter(target_1, 1),
                previous_period_data: previous_period_data,
                pre_deviation: pre_deviation,
                pre_arrow : pre_acheive ? 'up':'down',
                target_view : field.eagle_target_view,
                pre_view : field.eagle_prev_view,
                eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                eagle_icon_url: eagle_icon_url,
            }

            if (item_info.target_deviation===Infinity) item_info.target_arrow = false;

            var $kpi_preview;
            if(!kpi_data[1]){
                if(field.eagle_target_view ==="Number" || !field.eagle_goal_enable) {
                    $kpi_preview = $(QWeb.render("eagle_kpi_template",item_info));
                }
                else if (field.eagle_target_view === "Progress Bar" && field.eagle_goal_enable){
                    $kpi_preview = $(QWeb.render("eagle_kpi_template_3",item_info));
                    $kpi_preview.find('#eagle_progressbar').val(parseInt(item_info.target_progress_deviation));

                }

                if(field.eagle_goal_enable){
                    if(acheive){
                        $kpi_preview.find(".target_deviation").css({
                            "color" : "green",
                        });
                    } else{
                        $kpi_preview.find(".target_deviation").css({
                            "color" : "red",
                        });
                    }
                }
                if(field.eagle_previous_period && String(previous_period_data) && eagle_valid_date_selection.indexOf(eagle_date_filter_selection)>=0){
                    if(pre_acheive){
                        $kpi_preview.find(".pre_deviation").css({
                            "color" : "green",
                        });
                    }else{
                        $kpi_preview.find(".pre_deviation").css({
                            "color" : "red",
                        });
                    }
                }
                if($kpi_preview.find('.eagle_target_previous').children().length !== 2){
                    $kpi_preview.find('.eagle_target_previous').addClass('justify-content-center');
                }
            }
            else{
                switch(field.eagle_data_comparison){
                    case "None":
                        var count_tooltip = String(count_1)+"/"+String(count_2);
                        var count = String(eagle_self.ksNumFormatter(count_1,1))+"/"+String(eagle_self.ksNumFormatter(count_2,1));
                        item_info['count'] = count;
                        item_info['count_tooltip'] = count_tooltip;
                        item_info['target_enable'] = false;
                         $kpi_preview = $(QWeb.render("eagle_kpi_template_2",item_info));
                        break;
                    case "Sum":
                        var count = count_1 + count_2
                        item_info['count'] = eagle_self.ksNumFormatter(count, 1);
                        item_info['count_tooltip'] = count;
                        item_info['target_enable'] = field.eagle_goal_enable;
                        var eagle_color = (target_1-count)>0? "red" : "green";
                        item_info.pre_arrow = (target_1-count)>0? "down" : "up";
                        item_info['eagle_comparison'] = true;
                        var target_deviation = (target_1-count)>0? Math.round(((target_1-count)/target_1)*100) : Math.round((Math.abs((target_1-count))/target_1)*100);
                        if (target_deviation!==Infinity)  item_info.target_deviation = target_deviation + "%";
                        else {
                            item_info.target_deviation = target_deviation;
                            item_info.pre_arrow = false;
                        }
                        var target_progress_deviation = target_1 == 0 ? 0 : Math.round((count/target_1)*100);
                        item_info.target_progress_deviation = target_progress_deviation + "%";
                        $kpi_preview = $(QWeb.render("eagle_kpi_template_2",item_info));
                        $kpi_preview.find('.target_deviation').css({
                            "color":eagle_color
                        });
                        if(field.eagle_target_view === "Progress Bar"){
                            $kpi_preview.find('#eagle_progressbar').val(target_progress_deviation)
                        }
                        break;
                    case "Percentage":
                        var count = parseInt((count_1/count_2)*100);
                        item_info['count'] = count ? count+"%" : "0%";
                        item_info['count_tooltip'] = count ? count+"%" : "0%";
                        item_info.target_progress_deviation = item_info['count']
                        target_1 = target_1 > 100 ? 100 : target_1;
                        item_info.target = target_1 + "%";
                        item_info.pre_arrow = (target_1-count)>0? "down" : "up";
                        var eagle_color = (target_1-count)>0? "red" : "green";
                        item_info['target_enable'] = field.eagle_goal_enable;
                        item_info['eagle_comparison'] = false;
                        item_info.target_deviation = item_info.target > 100 ? 100 : item_info.target;
                         $kpi_preview = $(QWeb.render("eagle_kpi_template_2",item_info));
                        $kpi_preview.find('.target_deviation').css({
                            "color":eagle_color
                        });
                        if(field.eagle_target_view === "Progress Bar"){
                            if(count) $kpi_preview.find('#eagle_progressbar').val(count);
                            else $kpi_preview.find('#eagle_progressbar').val(0);
                        }
                        break;
                    case "Ratio":
                        var gcd = eagle_self.eagle_get_gcd(Math.round(count_1),Math.round(count_2));
                        item_info['count'] =  (isNaN(count_1/gcd)?0:eagle_self.ksNumFormatter(count_1/gcd, 1)) + ":" + (isNaN(count_2/gcd)?0:eagle_self.ksNumFormatter(count_2/gcd, 1));
                        item_info['count_tooltip'] =  (isNaN(count_1/gcd)?0:count_1/gcd) + ":" + (isNaN(count_2/gcd)?0:count_2/gcd);
                        item_info['target_enable'] = false;
                         $kpi_preview = $(QWeb.render("eagle_kpi_template_2",item_info));
                        break;
                }
            }
            $kpi_preview.find('.eagle_dashboarditem_id').css({
                "background-color" : eagle_rgba_background_color,
                "color":eagle_rgba_font_color,
            });
            var item_id = field.id;
            if (item_id in eagle_self.gridstackConfig) {
                grid.addWidget($kpi_preview, eagle_self.gridstackConfig[item_id].x, eagle_self.gridstackConfig[item_id].y, eagle_self.gridstackConfig[item_id].width, eagle_self.gridstackConfig[item_id].height, false, 6, null, 2, 3, item_id);
            } else {
                grid.addWidget($kpi_preview, 0, 0, 6, 2, true, 6, null, 2, 3, item_id);
            }
        },

        _renderListView: function (item, grid) {
            var eagle_self = this;
            var list_view_data = JSON.parse(item.eagle_list_view_data);
            var item_id = item.id,
                data_rows = list_view_data.data_rows,
                item_title = item.name;
            if(item.eagle_list_view_type === "ungrouped" && list_view_data){
                if(list_view_data.date_index){
                    var index_data = list_view_data.date_index;
                    for (var i = 0; i < index_data.length; i++){
                        for (var j = 0; j < list_view_data.data_rows.length; j++){
                            var index = index_data[i]
                            var date = list_view_data.data_rows[j]["data"][index]
                            list_view_data.data_rows[j]["data"][index] = moment(new Date(date+" UTC")), {}, {timezone: false};
                        }
                    }
                }
            }
            if(list_view_data){
                for (var i = 0; i < list_view_data.data_rows.length; i++){
                    for (var j = 0; j < list_view_data.data_rows[0]["data"].length; j++){
                        if(typeof(data_rows[i].data[j]) === "number"){
                            list_view_data.data_rows[i].data[j]  = data_rows[i].data[j]
                        }
                    }
                }
            }

            var $eagle_gridstack_container = $(QWeb.render('eagle_gridstack_list_view_container', {
                eagle_chart_title: item_title,
                ksIsDashboardManager: eagle_self.config.eagle_dashboard_manager,
                eagle_dashboard_list: eagle_self.config.eagle_dashboard_list,
                item_id : item_id,
            })).addClass('eagle_dashboarditem_id');
            var $ksItemContainer = $(QWeb.render('eagle_list_view_table', {
                list_view_data: list_view_data,
                item_id: item_id,
            }));
            $eagle_gridstack_container.find('.card-body').append($ksItemContainer);

            item.$el = $eagle_gridstack_container;
            if (item_id in eagle_self.gridstackConfig) {
                grid.addWidget($eagle_gridstack_container, eagle_self.gridstackConfig[item_id].x, eagle_self.gridstackConfig[item_id].y, eagle_self.gridstackConfig[item_id].width, eagle_self.gridstackConfig[item_id].height, false, 9, null, 3, null, item_id);
            } else {
                grid.addWidget($eagle_gridstack_container, 0, 0, 13, 4, true, 9, null, 3, null, item_id);
            }
        },

        stop: function() {
            this.widget.destroy();
        },

        ksFetchUpdateItem: function(id){
            var eagle_self = this;
            var item_data = eagle_self.config.eagle_item_data[id];
            return ajax.jsonRpc('/fetch/item/update', 'call', {
                model:  'eagle_dashboard.board',
                method: 'eagle_fetch_item_controller',
                args: [],
                kwargs: {
                    'item_id': [item_data.id],
                    'dashboard': item_data.eagle_dashboard_id,
//                    'type':
                },
                context: eagle_self.getContext(),
            }).then(function(new_item_data){
                this.config.eagle_item_data[item_data.id] = new_item_data[item_data.id];
                this.ksUpdateDashboardItem([item_data.id]);
            }.bind(this));
        },

        onChartCanvasClick : function(evt){
            var eagle_self = this;
            var item_id = evt.currentTarget.dataset.chartId;
            if (item_id in eagle_self.ksUpdateDashboard) {
                clearInterval(eagle_self.ksUpdateDashboard[item_id])
            }
            var myChart = eagle_self.chart_container[item_id];
            var activePoint = myChart.getElementAtEvent(evt)[0];
            if (activePoint){
                var item_data = eagle_self.config.eagle_item_data[item_id];
                var groupBy = item_data.eagle_chart_groupby_type==='relational_type'?item_data.eagle_chart_relation_groupby_name:item_data.eagle_chart_relation_groupby_name+':'+item_data.eagle_chart_date_groupby;

                if (activePoint._chart.data.domains){
                    var sequnce = item_data.sequnce ? item_data.sequnce : 0;
                    var domain = activePoint._chart.data.domains[activePoint._index]
                    if (item_data.max_sequnce != 0 && sequnce < item_data.max_sequnce){
                        ajax.jsonRpc('/fetch/drill_down/data', 'call', {
                            model:  'eagle_dashboard.item',
                            method: 'eagle_fetch_drill_down_data_controller',
                            args: [],
                            kwargs: {
                                'item_id': item_id,
                                'domain': domain,
                                'sequence': sequnce,
                            }
                        }).then(function(result){
                            eagle_self.config.eagle_item_data[item_id]['eagle_chart_data'] = result.eagle_chart_data;
                            eagle_self.config.eagle_item_data[item_id]['sequnce'] = result.sequence;
                            eagle_self.config.eagle_item_data[item_id]['eagle_dashboard_item_type']  = result.eagle_chart_type;
                            eagle_self.config.eagle_item_data[item_id]['isDrill'] = true;

                            if ('domains' in eagle_self.config.eagle_item_data[item_id]){
                                eagle_self.config.eagle_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.eagle_chart_data).previous_domain;
                            }
                            else {
                                eagle_self.config.eagle_item_data[item_id]['domains'] = {}
                                eagle_self.config.eagle_item_data[item_id]['domains'][result.sequence] = JSON.parse(result.eagle_chart_data).previous_domain;
                            }
                            eagle_self.ksUpdateDashboardItem([item_id]);
                        });
                    }
                }
            }
        },

        eagle_set_default_chart_view: function () {
            Chart.plugins.unregister(ChartDataLabels);
            Chart.plugins.register({
                afterDraw: function (chart) {
                    if (chart.data.labels.length === 0) {
                        // No data is present
                        var ctx = chart.chart.ctx;
                        var width = chart.chart.width;
                        var height = chart.chart.height
                        chart.clear();

                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = "3rem 'Lucida Grande'";
                        ctx.fillText('No data available', width / 2, height / 2);
                        ctx.restore();
                    }
                }
            });

            Chart.Legend.prototype.afterFit = function() {
                    var chart_type = this.chart.config.type;
                    if(chart_type === "pie" || chart_type ==="doughnut" ) {
                        this.height = this.height;
                    } else{
                        this.height = this.height + 20;
                    };
            };
        },

        ksOnDrillUp : function(e){
            var eagle_self = this;
            var item_id = e.currentTarget.dataset.itemId;
            var item_data = eagle_self.config.eagle_item_data[item_id];
            var domain = item_data['domains'][item_data.sequnce -  1]
            var sequnce = item_data.sequnce - 2;

            if(sequnce >= 0){
                ajax.jsonRpc('/fetch/drill_down/data', 'call', {
                    model:  'eagle_dashboard.item',
                    method: 'eagle_fetch_drill_down_data_controller',
                    args: [],
                    kwargs: {
                        'item_id': item_id,
                        'domain': domain,
                        'sequence': sequnce,
                    }
                }).then(function(result){
                    eagle_self.config.eagle_item_data[item_id]['eagle_chart_data'] = result.eagle_chart_data;
                    eagle_self.config.eagle_item_data[item_id]['sequnce'] = result.sequence;
                    eagle_self.config.eagle_item_data[item_id]['eagle_dashboard_item_type']  = result.eagle_chart_type;
                    eagle_self.ksUpdateDashboardItem([item_id]);
                });
            }
            else {
                eagle_self.ksFetchUpdateItem(item_id);
                var updateValue = eagle_self.config.eagle_item_data[item_id]["eagle_update_items_data"];
                if (updateValue){
                    var updateinterval = setInterval(function(){eagle_self.ksFetchUpdateItem(item_id)}, updateValue);
                    eagle_self.ksUpdateDashboard[item_id] = updateinterval;
                }
            }
        },
    })
});




