=====
Django-Parakeet
=====

DJparakeet is a simple chat application for django built on top of django-channels and django-tastypie.

1. Add djparakeet to your INSTALLED_APPS setting like this::

    INSTALLED_APPS = [
        ...
        'djparakeet',
    ]

2. Include the djparakeet URLconf in your project urls.py like this::

    url(r'^parakeet/', include('djparakeet.urls')),

3. Run `python manage.py migrate` to create the djparakeet models.

4. Run 	runserver (or read django-channel documentation how to use in production)

5. Add privileges to users to edit/create/delete Topic and Message in djparakeet app (using django-admin users admin, for example)

6. Visit http://127.0.0.1:8000/parakeet/ to see the chat.

