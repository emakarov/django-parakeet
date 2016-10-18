# -*- coding: utf-8 -*-
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib import auth

# Create your views here.
DJPARAKEET_INDEX_TEMPLATE = 'djparakeet/index.html'
DJPARAKEET_LOGIN_TEMPLATE = 'djparakeet/login.html'

parakeet_login_url = getattr(settings, 'PARAKEET_LOGIN_URL', settings.LOGIN_URL)


def login(request):
    if request.method == "POST":
        email = request.POST['email']
        password = request.POST['password']
        next = request.POST.get('next', '/parakeet/')
        username = None
        user = None
        try:
            username = get_user_model().objects.get(email=email).username
        except:
            pass
        if not username:
            try:
                username = get_user_model().objects.get(username=email).username
            except:
                pass
        if username:
            user = auth.authenticate(username=username, password=password)
            if user is not None and user.is_active:
                auth.login(request, user)
            return redirect(next)
        else:
            return redirect('/parakeet/login/?next=' + next)
    else:
        next = request.GET.get('next', None)
        params = {'next': next}
        return render(request, DJPARAKEET_LOGIN_TEMPLATE, params)


@login_required(login_url=parakeet_login_url)
def index(request):
    return render(request, DJPARAKEET_INDEX_TEMPLATE, {})
