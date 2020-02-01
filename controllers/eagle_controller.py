from eagle import http
from eagle.http import request


class KsWebsiteDashboard(http.Controller):

    @http.route(['/dashboard'], type='json', auth='public', website=True)
    def eagle_dashboard_handler(self, **post):
        dashboard_records = request.env['eagle_dashboard.board'].sudo().search_read([])

        return dashboard_records

    @http.route(['/dashboard/data'], type='json', auth='public', website=True)
    def eagle_dashboard_data_handler(self, **post):
        dashboard_config = {}
        eagle_company_id = ['|', ['eagle_company_id', '=', False]]

        eagle_dashboard_id = post.get('kwargs').get('id')
        eagle_type = post.get('kwargs').get('type')

        if self.eagle_check_login_user_or_not():
            eagle_company_id.append(['eagle_company_id', '=', request.env.user.company_id.id])
        else:
            eagle_company_id.append(['eagle_company_id', '=', request.website.company_id.id])

        if eagle_dashboard_id != 0:
            if eagle_type == 'user_data':
                if request.env.user in request.env['res.users'].sudo().search([]):
                    dashboard_config = request.env['eagle_dashboard.board'].eagle_fetch_dashboard_data(eagle_dashboard_id,
                                                                                                       eagle_company_id)
            else:
                dashboard_config = request.env['eagle_dashboard.board'].sudo().with_context(
                    force_company=eagle_company_id).eagle_fetch_dashboard_data(eagle_dashboard_id, eagle_company_id)
            dashboard_config['eagle_dashboard_manager'] = False
            return dashboard_config

        return {}

    @http.route(['/fetch/item/update'], type='json', auth='public', website=True)
    def eagle_fetch_item_controller(self, **post):
        item_records = {}
        eagle_item_id = post.get('kwargs').get('item_id')
        eagle_dashboard_id = post.get('kwargs').get('dashboard')
        eagle_type = post.get('kwargs').get('type')

        if eagle_type == 'user_data':
            if request.env.user in request.env['res.users'].sudo().search([]):
                item_records = request.env['eagle_dashboard.board'].eagle_fetch_item(eagle_item_id, eagle_dashboard_id)
        else:
            item_records = request.env['eagle_dashboard.board'].sudo().eagle_fetch_item(eagle_item_id, eagle_dashboard_id)

        return item_records

    @http.route(['/fetch/drill_down/data'], type='json', auth='public', website=True)
    def eagle_fetch_drill_down_data_controller(self, **post):
        item_records = {}
        if self.eagle_check_login_user_or_not():
            eagle_company_id = request.env.user.company_id.id
        else:
            eagle_company_id = request.website.company_id.id
        if post.get('kwargs').get('type') == 'user_data':
            if request.env.user in request.env['res.users'].sudo().search([]):
                item_records = request.env['eagle_dashboard.item'].eagle_fetch_drill_down_data(
                    post.get('kwargs').get('item_id'), post.get('kwargs').get('domain'), post.get('kwargs')
                        .get('sequence'))
        else:
            item_records = request.env['eagle_dashboard.item'].sudo().with_context(force_company=eagle_company_id
                                                                                      ).eagle_fetch_drill_down_data(
                post.get('kwargs').get('item_id'), post.get('kwargs').get('domain'), post.get('kwargs').get('sequence'))

        return item_records

    @http.route(['/check/user'], type='json', auth='public', website=True)
    def eagle_check_user_login(self, **post):
        return self.eagle_check_login_user_or_not()

    def eagle_check_login_user_or_not(self):
        if request.env.user in request.env['res.users'].sudo().search([]):
            return True
        return False
