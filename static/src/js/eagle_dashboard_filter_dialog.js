eagle.define('eagle_website_dashboard.eagle_dashboard_selector', function(require){
    'use static';

    var ajax = require('web.ajax');
    var core = require('web.core');
    var Widget = require('web.Widget');
    var animation = require('website.content.snippets.animation');
    var Widget = require('web.Widget');
    var eagle_widget = require('web_editor.widget');
    var core = require('web.core');
    var website = require('website.utils');
    var options = require('web_editor.snippets.options');
    var session = require('web.session');
    var eagle_dashboard = require('eagle_website_dashboard.eagle_website_dashboard')

    var _t = core._t;
    var qweb = core.qweb;

    var eagle_DashboardSelectionDialog = eagle_widget.Dialog.extend({
        start: function() {
             var eagle_self = this;
             eagle_self.eagle_setDashboardData(eagle_self);
             eagle_self._super();
        },
        eagle_setDashboardData:function(modal){
            var self = this;
            ajax.jsonRpc('/dashboard', 'call', {
                model:  'eagle_dashboard.board',
                method: 'eagle_dashboard_handler',
                args: [],
                kwargs: {
                }
            }).then(function (data) {
                var main_section = $("<div class='eagle_main_div'></div>")
                var select_label = $("<p style='margin: 5px 15px;'>Select Dashboard:</p>")
                var user_options = $("<label class='eagle_container'>All Data <input type='radio' name='eagle_data' checked='checked' value='all_data'> <span class='checkmark'></span></label> <label class='eagle_container'>User Data <input type='radio' name='eagle_data' value='user_data'> <span class='checkmark'></span></label>")
                select_label.appendTo(main_section)
                var select = $("<select></select>").attr("id", "eagle_slider_selection").attr("name", "Selection slider");
                $.each(data, function(index, item){
                    var eagle_dashboard_drop = "#dashboard-id-" + (item.id)
                    if($(eagle_dashboard_drop).length === 0){
                        select.append($("<option></option>").attr("value", item.name).attr("id", item.id).text(item.name));
                    }
                });
                if(select.find("option").length){
                    select_label.after(select[0]);
                    select[0].after(user_options[0], user_options[2]);
                    $(modal.$el).append(main_section);
                }
                else{
                    $(modal.$el).append(_t("No Slider For this page"));
                }
            });
        }
    });

    options.registry.dashboard_selector_action = options.Class.extend({
        on_prompt: function(eagle_self){
            var dialog = new eagle_DashboardSelectionDialog(eagle_self, {
                title: _t("Select Dashboard"),
            });
            dialog.open();
            dialog.on('save', this, function(){
                eagle_self.dashboard_id = $('#eagle_slider_selection').find(":selected").attr("id");
                eagle_self.data_selection = $('input:radio:checked').attr('value')
                var eagle_web_dashboard =  new animation.registry.snippet_dashboard_home_page(eagle_self);
                eagle_web_dashboard.start(eagle_self.dashboard_id, eagle_self.data_selection, eagle_self);
            });
            dialog.on('cancel', this, function(){
                this.$target.remove();
            })
        },
        onBuilt: function() {
            var eagle_self = this;
            eagle_self.on_prompt(eagle_self)
            return this._super();
        },
        cleanForSave: function() {
            this.$target.empty();
        },
    });
});
