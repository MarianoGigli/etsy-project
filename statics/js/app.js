/* Router */
function Router(){
    this.routes = {};
};

Router.prototype = {
    navigate: function(extra_params) {
        var uri = decodeURIComponent(window.location.hash);
        var params = this.parse_uri(uri);
        var url_hash = '';
        for (var attr in extra_params) {
            params[attr] = extra_params[attr];
        }
        for (key in params) {
            if(params[key] && key != "limit"){
                url_hash += '/' + key + '/' + params[key];
            }
        }
        window.location.hash = url_hash;
    },
    parse_uri: function(uri){
        var patern = {
            keywords: /keywords\/([^\/&]+)/,
            sort_on: /sort_on\/(created|price|score)/,
            sort_order: /sort_order\/(up|down)/,
            min_price: /min_price\/([0-9]+)/,
            max_price: /max_price\/([0-9]+)/,
            page: /page\/([0-9]+)/
        };
        var extra_params = {};
        if (typeof uri.match(patern.keywords) !== 'undefined' && uri.match(patern.keywords) !== null){
            extra_params.keywords = uri.match(patern.keywords)[1];
        }
        if (typeof uri.match(patern.sort_on) !== 'undefined' && uri.match(patern.sort_on) !== null){
            extra_params.sort_on = uri.match(patern.sort_on)[1];
        }
        if (typeof uri.match(patern.sort_order) !== 'undefined' && uri.match(patern.sort_order) !== null){
            extra_params.sort_order = uri.match(patern.sort_order)[1];
        }
        if (typeof uri.match(patern.price) !== 'undefined' && uri.match(patern.price) !== null){
            extra_params.price = uri.match(patern.price)[1];
        }
        if (typeof uri.match(patern.min_price) !== 'undefined' && uri.match(patern.min_price) !== null){
            extra_params.min_price = uri.match(patern.min_price)[1];
        }
        if (typeof uri.match(patern.max_price) !== 'undefined' && uri.match(patern.max_price) !== null){
            extra_params.max_price = uri.match(patern.max_price)[1];
        }
        if (typeof uri.match(patern.page) !== 'undefined' && uri.match(patern.page) !== null){
            extra_params.page = uri.match(patern.page)[1];
        }
        return extra_params;
    },
    route: function () {
        var hash = decodeURIComponent(window.location.hash) || '';
        if (typeof this.router.routes[hash] === 'undefined' || this.router.routes[hash] === null){
            this.router.routes[hash] = this.router.parse_uri(hash);
        }
        this.api.fetch(this.query_params(this.router.routes[hash]), this.parse.bind(this));
    }
};


/* API */
function Api(api_key, url){
    this.api_key = (api_key)? api_key : 'kd863bvbqpbk67beub60pi5p';
    this.url= (url)? url : 'https://openapi.etsy.com/v2/listings/active.js';
    this.base_url= this.url + '?api_key=' + this.api_key;
};

Api.prototype = {
    fetch: function (params, callback) {
        this.callback = callback;
        var url_params = '&callback=app.api.callback&includes=Images(url_570xN):1:0';
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
    this.router = new Router();
    this.api = new Api(api_key, api_url);
    this.form = document.getElementById(form);
    this.results = document.getElementById(results);
    this.paginator_id = paginator_id;
    this.bind_event(this.form,'submit', this.submit.bind(this), false);
    this.bind_event(window, 'hashchange', this.router.route.bind(this), false);
    this.bind_event(window, 'load', this.router.route.bind(this), false);
}

App.prototype = {
    bind_event: function (target, event, func, capture) {
        if(typeof target !== "undefined" && target !== null){
            target.addEventListener(event, func, capture);
        }
    },
    bind_remove_elements: function () {
        var bind_remove_elem = document.getElementsByClassName('view-more delete');
        for(var x=0; x < bind_remove_elem.length; x++){
            this.bind_event(bind_remove_elem[x], 'click', this.set_exclude_item.bind(this), false);
        }
    },
    query_params: function (extra_params) {
        var keywords = (extra_params.keywords)? extra_params.keywords : this.form.query.value;
        var sort_on = (extra_params.sort_on)? extra_params.sort_on : this.form.order.value;
        var sort_order = (extra_params.sort_order)? extra_params.sort_order : this.form.direction.value;
        var price = (extra_params.price)? extra_params.price.split(';') : this.form.price.value.split(';');
        var min_price = (extra_params.min_price)? extra_params.min_price : price[0];
        var max_price = (extra_params.max_price)? extra_params.max_price : price[1];
        var page = (extra_params.page)? extra_params.page : 1;
        this.params = {
            keywords: keywords,
            sort_on: sort_on,
            sort_order: sort_order,
            min_price: (min_price)? parseFloat(min_price) : min_price,
            max_price: (max_price)? parseFloat(max_price) : max_price,
            page: parseInt(page),
            limit: 10
        };
        return this.params;
    },
    submit: function (event) {
        this.router.navigate(this.query_params({}));
        event.preventDefault();
    },
    parse: function (data) {
        if (parseInt(data.params.page) === parseInt(this.params.page)) {
            this.clear_results();
        }
        data = this.exclude_items(data);
        this.results.appendChild(this.parse_items(data.results));
        this.bind_remove_elements();
        data.pagination.count = data.count;
        this.results.appendChild(this.paginator(data.pagination));
        this.paginator_el = document.getElementById(this.paginator_id);
        this.bind_event(this.paginator_el, 'click', this.get_page.bind(this), false);

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
    exclude_items: function (data) {
        data.results = data.results.filter(this.remove_item);
        return data;
    },
    remove_item: function (item){
        var excludes_items = localStorage.getItem('excludes_items');
        if(excludes_items !== null){
            excludes_items = excludes_items.split(',');
            for(var x=0; x < excludes_items.length; x++){
                if (item.listing_id == excludes_items[x]){
                    return false;
                }
            }
            return true;
        }
        return true;
    },
    set_exclude_item: function (event) {
        var current_content = window.localStorage.getItem('excludes_items');
        var listing_id = event.target.dataset.id;
        if(current_content === null){
            window.localStorage.setItem('excludes_items',listing_id);
        }else{
            window.localStorage.setItem('excludes_items',current_content+','+listing_id);
        }
        event.toElement.parentNode.parentNode.parentNode.className = " item-result-removed";
        event.preventDefault();
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
        this.router.navigate(page);
        event.preventDefault();
    }
};