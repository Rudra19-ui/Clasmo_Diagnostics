from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLE_USER = 'user'
    ROLE_ADMIN = 'admin'
    ROLE_TECHNICIAN = 'technician'
    ROLE_PATHOLOGIST = 'pathologist'
    ROLE_CHOICES = [
        (ROLE_USER, 'User'),
        (ROLE_ADMIN, 'Admin'),
        (ROLE_TECHNICIAN, 'Technician'),
        (ROLE_PATHOLOGIST, 'Pathologist'),
    ]
    CLINICAL_ROLES = {ROLE_ADMIN, ROLE_TECHNICIAN, ROLE_PATHOLOGIST}

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
    display_name = models.CharField(max_length=100, blank=True)
    lab_code = models.CharField(max_length=20, default='202505017')


class TestCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Test(models.Model):
    name = models.CharField(max_length=200)
    short_name = models.CharField(max_length=50, blank=True)
    test_code = models.CharField(max_length=50, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(
        TestCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='tests'
    )

    def __str__(self):
        return self.name


class Patient(models.Model):
    PATIENT_TYPES = [('O.P.D.', 'O.P.D.'), ('I.P.D.', 'I.P.D.'), ('Corporate', 'Corporate')]
    TITLES = [('Mr.', 'Mr.'), ('Mrs.', 'Mrs.'), ('Ms.', 'Ms.'), ('Dr.', 'Dr.')]
    GENDERS = [('male', 'Male'), ('female', 'Female'), ('none', 'None')]

    patient_type = models.CharField(max_length=20, choices=PATIENT_TYPES, default='O.P.D.')
    title = models.CharField(max_length=10, choices=TITLES, default='Mr.')
    patient_name = models.CharField(max_length=200)
    gender = models.CharField(max_length=10, choices=GENDERS, default='male')
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    patient_id = models.CharField(max_length=50, blank=True)
    date_of_birth = models.CharField(max_length=20, blank=True)
    age_years = models.PositiveIntegerField(default=0)
    age_months = models.PositiveIntegerField(default=0)
    age_days = models.PositiveIntegerField(default=0)
    doctor_name = models.CharField(max_length=200, blank=True)
    affiliation = models.CharField(max_length=200, blank=True)
    collection_center = models.CharField(max_length=200, default='CLASMO Diagnostics pvt')
    sample_collected_at = models.CharField(max_length=200, blank=True)
    collection_round_boy = models.CharField(max_length=200, blank=True)
    send_result_sms = models.BooleanField(default=False)
    is_register = models.BooleanField(default=False)
    home_collection = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.title} {self.patient_name}'


class Registration(models.Model):
    STATUS_REGISTERED = 'Registered'
    STATUS_COLLECTION = 'Collection'
    STATUS_RESULT_READY = 'Result Ready'
    STATUS_PRINTED = 'Printed'
    STATUS_CHOICES = [
        (STATUS_REGISTERED, 'Registered'),
        (STATUS_COLLECTION, 'Collection'),
        (STATUS_RESULT_READY, 'Result Ready'),
        (STATUS_PRINTED, 'Printed'),
    ]

    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('credit', 'Credit Card'),
        ('debit', 'Debit Card'),
        ('cheque', 'Cheque'),
        ('others', 'Others'),
    ]

    lab_code = models.CharField(max_length=20, unique=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='registrations')
    registration_date = models.DateTimeField(default=timezone.now)
    collection_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_REGISTERED)
    comment = models.TextField(blank=True)
    urgency = models.BooleanField(default=False)
    discount_test = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_regn = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_type = models.CharField(max_length=5, default='Amt')
    discount_reason = models.CharField(max_length=100, blank=True)
    discount_authorization = models.CharField(max_length=100, blank=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cash')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    visiting_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    recovery_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bill_receipt_no = models.CharField(max_length=50, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.lab_code


class RegistrationTest(models.Model):
    registration = models.ForeignKey(Registration, on_delete=models.CASCADE, related_name='tests')
    test = models.ForeignKey(Test, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f'{self.registration.lab_code} - {self.test.name}'


class PickupRequest(models.Model):
    patient_name = models.CharField(max_length=200)
    mobile = models.CharField(max_length=20)
    address = models.TextField()
    pickup_date = models.DateField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.patient_name} - {self.pickup_date}'


class LabMessage(models.Model):
    message = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.message[:50]


class TestParameter(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='parameters')
    parameter_name = models.CharField(max_length=200)
    unit = models.CharField(max_length=50, blank=True)
    reference_range_male = models.CharField(max_length=100, blank=True)
    reference_range_female = models.CharField(max_length=100, blank=True)
    reference_range_child = models.CharField(max_length=100, blank=True)
    critical_low = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    critical_high = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['test__name', 'parameter_name']
        constraints = [
            models.UniqueConstraint(
                fields=['test', 'parameter_name'],
                name='unique_parameter_per_test',
            ),
        ]
        indexes = [
            models.Index(fields=['test', 'is_active']),
        ]

    def __str__(self):
        return f'{self.test.name} - {self.parameter_name}'


class Report(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ENTERED = 'entered'
    STATUS_VERIFIED = 'verified'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ENTERED, 'Entered'),
        (STATUS_VERIFIED, 'Verified'),
    ]

    registration = models.OneToOneField(
        Registration, on_delete=models.CASCADE, related_name='clinical_report'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    entered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_entered'
    )
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_verified'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Report {self.registration.lab_code}'


class ReportValue(models.Model):
    FLAG_NORMAL = 'Normal'
    FLAG_HIGH = 'High'
    FLAG_LOW = 'Low'
    FLAG_CRITICAL = 'Critical'
    FLAG_CHOICES = [
        (FLAG_NORMAL, 'Normal'),
        (FLAG_HIGH, 'High'),
        (FLAG_LOW, 'Low'),
        (FLAG_CRITICAL, 'Critical'),
    ]

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='values')
    parameter = models.ForeignKey(TestParameter, on_delete=models.PROTECT, related_name='report_values')
    value = models.CharField(max_length=100)
    flag = models.CharField(max_length=20, choices=FLAG_CHOICES, default=FLAG_NORMAL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['report', 'parameter'],
                name='unique_value_per_parameter',
            ),
        ]

    def __str__(self):
        return f'{self.parameter.parameter_name}: {self.value} ({self.flag})'
