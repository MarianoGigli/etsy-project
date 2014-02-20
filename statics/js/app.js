/* API */
function Api(api_key, url){
    this.api_key = (api_key)? api_key : 'kd863bvbqpbk67beub60pi5p';
    this.url= (url)? url : 'https://openapi.etsy.com/v2/listings/active.js';
    this.base_url= this.url + '?api_key=' + this.api_key;
};

Api.prototype = {
    fetch: function (params, callback) {
        this.callback = callback;
        var url_params = '&callback=api.callback&includes=Images(url_570xN):1:0';
        for (key in params) {
            if(params[key]){
                url_params += '&' + key + '=' + params[key];
            }
        }
        var script = document.createElement("script");
        script.setAttribute("type", "text/javascript");
        script.setAttribute("src", this.base_url + url_params);
        document.getElementsByTagName("head")[0].appendChild(script);
    },
    callback: function(){}
};
var api = new Api();

/* Item */
function Item (data){
    this.data = data;
};

Item.prototype = {
    get: function (attr) {
        var result = undefined;
        if(typeof this.data[attr] !== 'undefined'){
            result = this.data[attr];
        }
        return result;
    },
    category: function () {
        var category = '';
        if(typeof this.get('category_path') !== 'undefined'){
            category = this.get('category_path');
        }
        return  category;
    },
    image_url: function () {
        var image = '';
        if(typeof this.get('Images') !== 'undefined'){
            image = this.get('Images')[0].url_570xN;
        }
        return  image;
    }
};

/* Generic Views */
function Views(params){
    this.element = (params.element)? params.element : 'div';
    this.class = (params.class)? params.class : '';
    this.template = (params.template)? params.template : '';
};

Views.prototype = {
    render: function (item) {
        var elem = document.createElement(this.element);
        var template = doT.template(document.getElementById(this.template).text);
        elem.setAttribute('class', this.class);
        elem.innerHTML = template(item);
        this.elem = elem;
    }
};

/* Paginartor */
function Paginator (data){
    this.data = data;
};

Paginator.prototype = {
    get: function (attr) {
        return this.data[attr];
    },
    get_limit: function () {
        return this.get('effective_limit') ? this.get('effective_limit') : 1;
    },
    get_current: function () {
        return this.get('effective_page') ? this.get('effective_page') : 1;
    },
    get_first: function () {
        return 1;
    },
    get_last: function () {
        return Math.ceil(this.get('count')/this.get('effective_limit'));
    },
    get_prev: function () {
        var prev = this.get_current() - 1;
        return (prev > 0) ? prev : 1;
    },
    get_next: function () {
        return this.get('next_page')? this.get('next_page') : this.get_last();
    },
    get_segment: function range(start, end, step){
        var first = 1;
        var last = this.get_last();
        var result = [];
        if (typeof end === 'undefined'){
            start = 0;
            end = start;
        };
        if (typeof step === 'undefined'){
            step = 1;
        };
        if ((step > 0 && start>=end) || (step < 0 && start <= end)){
            return [];
        };
        for (i = start+step; step>0 ? i <= end : i >= end; i += step){
            if (step > 0 && i <= last){
                result.push(i);
            }
            if (step < 0 && i >= first){
                result.push(i);
            }

        };
        return step>0 ? result : result.reverse();
    }
};

/* Main application */
function App(form, results, paginator_id, api_key, api_url){
    this.api = new Api(api_key, api_url);
    this.form = document.getElementById(form);
    this.results = document.getElementById(results);
    this.paginator_id = paginator_id;
    this.query_set = {};
    this.loading = false;
    this.bind_events();
}

App.prototype = {
    bind_events: function (target, event, func, capture) {
        if(typeof target !== "undefined" && target !== null){
            target.addEventListener(event, func, capture);
        }
        this.form.addEventListener('submit', this.submit.bind(this), false);
    },
    query_params: function (extra_params) {
        var price = this.form.price.value.split(';');
        var page = (extra_params.page)? extra_params.page : 1;
        this.params = {
            keywords: this.form.query.value,
            sort_on: this.form.order.value,
            sort_order: this.form.direction.value,
            min_price: price[0],
            max_price: price[1],
            page: parseInt(page),
            limit: 10
        };
        return this.params;
    },
    submit: function (event) {
        api.fetch(this.query_params({page: 1}), this.parse.bind(this));
        event.preventDefault();
        return false;
    },
    parse: function (data) {
//        var _this = this;
        if (parseInt(data.params.page) === parseInt(this.params.page)) {
            this.clear_results();
        }
        this.results.appendChild(this.parse_items(data.results));
        data.pagination.count = data.count;
        this.results.appendChild(this.paginator(data.pagination));
        this.paginator_el = document.getElementById(this.paginator_id);
        this.bind_events(this.paginator_el, 'click', this.get_page.bind(this), false);
    },
    parse_items: function (results) {
        var buffer = document.createDocumentFragment();
        var item;
        var params = {
            element: 'div',
            template: 'item-tpl',
            class: 'item-result'
        };
        var item_view = new Views(params);
        for (var i = 0; i < results.length; i++) {
            item = new Item(results[i]);
            if(!item.data.error_messages){
                item_view.render(item);
                buffer.appendChild(item_view.elem);
            }
        }
        if(parseInt(results.length) === 0){
            this.no_results(buffer);
        }
        return buffer;
    },
    no_results: function (buffer) {
        var no_results = [{message: 'No result found'}];
        var params = {
            template: 'no-result-tpl'
        };
        var message_view = new Views(params);
        var item = new Item(no_results[0]);
        message_view.render(item);
        buffer.appendChild(message_view.elem);
    },
    paginator: function (data) {
        var buffer = document.createDocumentFragment();
        var paginator;
        var params = {
            element: 'div',
            template: 'pagination-tpl',
            class: 'paginator'
        };
        var paginator_view = new Views(params);
        paginator = new Paginator(data);
        paginator_view.render(paginator);
        buffer.appendChild(paginator_view.elem);
        return buffer;
    },
    clear_results: function () {
        while (this.results.firstChild) {
            this.results.removeChild(this.results.firstChild);
        }
    },
    get_page: function (event, page) {
        page = {
            page: event.target.dataset.page
        };
        api.fetch(this.query_params(page), this.parse.bind(this));
        event.preventDefault();
        return false;
    }
};