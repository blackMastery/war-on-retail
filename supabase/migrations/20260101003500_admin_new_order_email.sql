-- Admin new-order notification template.
-- Fired automatically on checkout to every active admin_users email.
-- Editable from /admin/email-templates; cannot be deleted (is_system).

insert into public.email_templates (slug, name, subject, body_html, is_system) values
  (
    'admin_new_order',
    'Admin · New order',
    'New order {{order_number}}',
    '<p>A new order just came in.</p>'
      || '<p><strong>{{order_number}}</strong> · {{order_date}} · {{order_total}}</p>'
      || '<p>Customer: <strong>{{customer_name}}</strong><br/>Phone: {{customer_phone}}</p>'
      || '<h3>Items</h3>{{order_items}}'
      || '<p><a href="{{admin_order_url}}">Open order in admin</a></p>',
    true
  )
on conflict (slug) do nothing;
