from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLE_USER = 'user'
    ROLE_ADMIN = 'admin'
    ROLE_TECHNICIAN = 'technician'
    ROLE_PATHOLOGIST = 'pathologist'
    ROLE_HR = 'hr'
    ROLE_RECEPTIONIST = 'receptionist'
    ROLE_SUPER_FRANCHISEE = 'super_franchisee'
    ROLE_FRANCHISEE = 'franchisee'
    ROLE_SUB_FRANCHISE = 'sub_franchise'
    ROLE_CHOICES = [
        (ROLE_USER, 'User'),
        (ROLE_ADMIN, 'Admin'),
        (ROLE_HR, 'HR'),
        (ROLE_PATHOLOGIST, 'Pathologist'),
        (ROLE_TECHNICIAN, 'Technician'),
        (ROLE_RECEPTIONIST, 'Receptionist'),
        (ROLE_SUPER_FRANCHISEE, 'Super Franchisee'),
        (ROLE_FRANCHISEE, 'Franchisee'),
        (ROLE_SUB_FRANCHISE, 'Sub-Franchise'),
    ]
    CLINICAL_ROLES = {ROLE_ADMIN, ROLE_TECHNICIAN, ROLE_PATHOLOGIST}
    FRANCHISE_ROLES = {ROLE_SUPER_FRANCHISEE, ROLE_FRANCHISEE, ROLE_SUB_FRANCHISE}
    PARENT_REQUIRED_ROLES = {ROLE_FRANCHISEE, ROLE_SUB_FRANCHISE}
    SIGNUP_ROLES = {
        ROLE_ADMIN,
        ROLE_HR,
        ROLE_PATHOLOGIST,
        ROLE_TECHNICIAN,
        ROLE_USER,
        ROLE_RECEPTIONIST,
        ROLE_SUPER_FRANCHISEE,
        ROLE_FRANCHISEE,
        ROLE_SUB_FRANCHISE,
    }

    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default=ROLE_USER)
    display_name = models.CharField(max_length=100, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    lab_code = models.CharField(max_length=20, default='202505017')
    save_credentials = models.BooleanField(default=False)
    save_info = models.BooleanField(default=False)
    parent_franchisee = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='franchise_children',
        help_text='Parent Super Franchisee or Franchisee in the management chain.',
    )

    def expected_parent_role(self):
        if self.role == self.ROLE_FRANCHISEE:
            return self.ROLE_SUPER_FRANCHISEE
        if self.role == self.ROLE_SUB_FRANCHISE:
            return self.ROLE_FRANCHISEE
        return None

    def __str__(self):
        return self.display_name or self.username


class LoginLog(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_logs',
    )
    username_attempt = models.CharField(max_length=150)
    success = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = 'success' if self.success else 'failed'
        return f'{self.username_attempt} ({status})'


class LabRole(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict)
    is_system = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class TestCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Test(models.Model):
    name = models.CharField(max_length=200)
    short_name = models.CharField(max_length=50, blank=True)
    test_code = models.CharField(max_length=50, blank=True)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sample_type = models.CharField(max_length=150, blank=True)
    category = models.ForeignKey(
        TestCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='tests'
    )

    def __str__(self):
        return self.name


class Patient(models.Model):
    PATIENT_TYPES = [('O.P.D.', 'O.P.D.'), ('I.P.D.', 'I.P.D.'), ('Corporate', 'Corporate')]
    TITLES = [
        ('Mr.', 'Mr.'), ('Ms.', 'Ms.'), ('Mrs.', 'Mrs.'), ('MT.', 'MT.'),
        ('Dr.', 'Dr.'), ('Master', 'Master'), ('B/O', 'B/O'), ('Baby', 'Baby'),
    ]
    GENDERS = [('male', 'Male'), ('female', 'Female'), ('none', 'None')]
    MARITAL_STATUSES = [
        ('married', 'Married'),
        ('unmarried', 'Unmarried'),
        ('divorced', 'Divorced'),
        ('widow', 'Widow'),
    ]
    BLOOD_GROUPS = [
        ('A +ve', 'A +ve'), ('A -ve', 'A -ve'),
        ('B +ve', 'B +ve'), ('B -ve', 'B -ve'),
        ('AB +ve', 'AB +ve'), ('AB -ve', 'AB -ve'),
        ('O +ve', 'O +ve'), ('O -ve', 'O -ve'),
    ]
    AGE_UNITS = [('yr', 'Yr'), ('month', 'Month'), ('day', 'Day')]
    PRIMARY_TEL_TYPES = [
        ('office', 'TelePhone office'),
        ('residence', 'Telephone Res'),
        ('mobile', 'TelePhone Mobile'),
    ]
    ADDRESS_TYPES = [('office', 'Office'), ('residence', 'Residence')]

    patient_type = models.CharField(max_length=20, choices=PATIENT_TYPES, default='O.P.D.')
    title = models.CharField(max_length=10, choices=TITLES, default='Mr.')
    patient_name = models.CharField(max_length=200)
    first_name = models.CharField(max_length=100, blank=True)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    short_name = models.CharField(max_length=50, blank=True)
    gender = models.CharField(max_length=10, choices=GENDERS, default='male')
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    email2 = models.EmailField(blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    patient_id = models.CharField(max_length=50, blank=True)
    medical_record_no = models.CharField(max_length=50, unique=True, null=True, blank=True)
    bar_code = models.CharField(max_length=50, blank=True)
    date_of_birth = models.CharField(max_length=20, blank=True)
    age_years = models.PositiveIntegerField(default=0)
    age_months = models.PositiveIntegerField(default=0)
    age_days = models.PositiveIntegerField(default=0)
    age_unit = models.CharField(max_length=10, choices=AGE_UNITS, default='yr')
    marital_status = models.CharField(max_length=20, choices=MARITAL_STATUSES, blank=True)
    blood_group = models.CharField(max_length=10, choices=BLOOD_GROUPS, blank=True)
    family_doctor = models.ForeignKey(
        'Doctor', on_delete=models.SET_NULL, null=True, blank=True, related_name='patients'
    )
    religion = models.CharField(max_length=100, blank=True)
    telephone_office = models.CharField(max_length=30, blank=True)
    telephone_residence = models.CharField(max_length=30, blank=True)
    primary_tel_type = models.CharField(max_length=20, choices=PRIMARY_TEL_TYPES, blank=True)
    master_comment = models.TextField(blank=True)
    insurance_id = models.CharField(max_length=100, blank=True)
    insurance_company = models.CharField(max_length=200, blank=True)
    insurance_start_date = models.CharField(max_length=20, blank=True)
    insurance_expiry_date = models.CharField(max_length=20, blank=True)
    other_data_comment = models.TextField(blank=True)
    doctor_name = models.CharField(max_length=200, blank=True)
    affiliation = models.CharField(max_length=200, blank=True)
    collection_center = models.CharField(max_length=200, default='CLASMO Diagnostics pvt')
    sample_collected_at = models.CharField(max_length=200, blank=True)
    collection_round_boy = models.CharField(max_length=200, blank=True)
    send_result_sms = models.BooleanField(default=False)
    is_register = models.BooleanField(default=False)
    home_collection = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title} {self.display_name}'.strip()

    @property
    def display_name(self):
        if self.first_name or self.last_name:
            parts = [self.first_name, self.middle_name, self.last_name]
            return ' '.join(part for part in parts if part).strip()
        return self.patient_name

    def sync_computed_fields(self):
        if self.first_name or self.middle_name or self.last_name:
            self.patient_name = self.display_name
        if self.family_doctor_id:
            self.doctor_name = self.family_doctor.full_name
        default_address = self.addresses.filter(is_default=True).first() or self.addresses.first()
        if default_address:
            lines = [default_address.address_line1, default_address.address_line2, default_address.address_line3]
            self.address = ', '.join(line for line in lines if line)
            self.city = default_address.city or self.city


class PatientAddress(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='addresses')
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    address_line3 = models.CharField(max_length=200, blank=True)
    country = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    address_type = models.CharField(
        max_length=20, choices=Patient.ADDRESS_TYPES, default='residence', blank=True
    )
    is_default = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.address_line1 or f'Address {self.id}'


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


class PatientSampleBarcode(models.Model):
    """Links a preprinted physical barcode label to a patient / registration sample."""

    barcode = models.CharField(max_length=100, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='sample_barcodes')
    registration = models.ForeignKey(
        Registration,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='linked_barcodes',
    )
    sample_type = models.CharField(max_length=100, blank=True)
    linked_test_ids = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    linked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_sample_barcodes',
    )
    linked_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-linked_at']
        indexes = [
            models.Index(fields=['patient', 'sample_type']),
            models.Index(fields=['registration', 'sample_type']),
        ]

    def __str__(self):
        return f'{self.barcode} → {self.patient.patient_id or self.patient_id}'


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


class MembershipType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    duration_months = models.PositiveIntegerField(default=12)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Membership(models.Model):
    patient_name = models.CharField(max_length=200)
    membership_type = models.ForeignKey(
        MembershipType, on_delete=models.PROTECT, related_name='memberships'
    )
    profile_image = models.ImageField(upload_to='memberships/', blank=True, null=True)
    membership_validation = models.CharField(max_length=100)
    membership_number = models.CharField(max_length=50, unique=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='memberships_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.patient_name} - {self.membership_type.name}'

    def save(self, *args, **kwargs):
        if not self.membership_number:
            last = Membership.objects.order_by('-id').first()
            next_num = (last.id if last else 0) + 1
            self.membership_number = f'MEM{timezone.now().strftime("%Y%m")}{next_num:04d}'
        super().save(*args, **kwargs)


class CollectionCenter(models.Model):
    TYPE_INTERNAL = 'internal'
    TYPE_EXTERNAL = 'external'
    TYPE_CHOICES = [
        (TYPE_INTERNAL, 'Internal'),
        (TYPE_EXTERNAL, 'External'),
    ]

    PARTY_CASH = 'cash_party'
    PARTY_CREDIT = 'credit_party'
    PARTY_CHOICES = [
        (PARTY_CASH, 'Cash Party'),
        (PARTY_CREDIT, 'Credit Party'),
    ]

    FREQ_DAILY = 'daily'
    FREQ_MONTHLY = 'monthly'
    FREQ_YEARLY = 'yearly'
    FREQ_CHOICES = [
        (FREQ_DAILY, 'Daily'),
        (FREQ_MONTHLY, 'Monthly'),
        (FREQ_YEARLY, 'Yearly'),
    ]

    BILLING_PREPAID = 'prepaid'
    BILLING_POSTPAID = 'postpaid'
    BILLING_NONE = 'none'
    BILLING_CHOICES = [
        (BILLING_PREPAID, 'IsPrepaid'),
        (BILLING_POSTPAID, 'IsPostpaid'),
        (BILLING_NONE, 'None'),
    ]

    name = models.CharField(max_length=200, unique=True)
    center_type = models.CharField(max_length=20, choices=TYPE_CHOICES, blank=True)
    party_type = models.CharField(max_length=20, choices=PARTY_CHOICES, blank=True)
    is_default = models.BooleanField(default=False)
    has_result_sms = models.BooleanField(default=False)
    report_print_exception = models.BooleanField(default=False)
    comment = models.TextField(blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    address_line3 = models.CharField(max_length=200, blank=True)
    country = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    voucher_type = models.CharField(max_length=100, blank=True)
    ledger_name = models.CharField(max_length=200, blank=True)
    labcode_short_name = models.CharField(max_length=50, blank=True)
    labcode = models.CharField(max_length=50, blank=True)
    labcode_start = models.CharField(max_length=50, blank=True)
    frequency = models.CharField(max_length=20, choices=FREQ_CHOICES, blank=True)
    auto_increment = models.BooleanField(default=False)
    rate_master = models.CharField(max_length=100, blank=True)
    credit_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    invoice_payment_period_days = models.PositiveIntegerField(default=0)
    billing_type = models.CharField(max_length=20, choices=BILLING_CHOICES, blank=True, default=BILLING_NONE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Area(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Areas'

    def __str__(self):
        return self.name


class RateMaster(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Rate masters'

    def __str__(self):
        return self.name


class CollectionCenterBoy(models.Model):
    GENDER_MALE = 'male'
    GENDER_FEMALE = 'female'
    GENDER_OTHER = 'other'
    GENDER_CHOICES = [
        (GENDER_MALE, 'Male'),
        (GENDER_FEMALE, 'Female'),
        (GENDER_OTHER, 'Other'),
    ]

    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    short_name = models.CharField(max_length=50, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    email = models.EmailField(blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    collection_center = models.ForeignKey(
        CollectionCenter, on_delete=models.PROTECT, related_name='boys'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['first_name', 'last_name']
        verbose_name_plural = 'Collection center boys'

    def __str__(self):
        return self.short_name or f'{self.first_name} {self.last_name}'.strip()


class DiscountReason(models.Model):
    reason = models.CharField(max_length=200)
    comment = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reason']

    def __str__(self):
        return self.reason


class DiscountAuthority(models.Model):
    authorization_name = models.CharField(max_length=200)
    authorized_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='discount_authorities'
    )
    mobile = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['authorization_name']
        verbose_name_plural = 'Discount authorities'

    def __str__(self):
        return self.authorization_name


class WhatsAppMessageLog(models.Model):
    STATUS_SENT = 'Sent'
    STATUS_FAILED = 'Failed'
    STATUS_PENDING = 'Pending'
    STATUS_CHOICES = [
        (STATUS_SENT, 'Sent'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_PENDING, 'Pending'),
    ]

    message_date = models.DateTimeField(auto_now_add=True)
    registration = models.ForeignKey(
        Registration, on_delete=models.SET_NULL, null=True, blank=True, related_name='whatsapp_logs'
    )
    lab_code = models.CharField(max_length=50)
    patient_name = models.CharField(max_length=200)
    mobile_no = models.CharField(max_length=20)
    referred_by = models.CharField(max_length=200, blank=True)
    sent_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='whatsapp_logs'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SENT)
    message_text = models.TextField(blank=True)

    class Meta:
        ordering = ['-message_date']
        verbose_name = 'WhatsApp message log'

    def __str__(self):
        return f'{self.lab_code} - {self.mobile_no}'


class ExpenseType(models.Model):
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Expense type'

    def __str__(self):
        return self.name


class Affiliation(models.Model):
    name = models.CharField(max_length=200, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Affiliations'

    def __str__(self):
        return self.name


class SalesReference(models.Model):
    name = models.CharField(max_length=200, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Sales references'

    def __str__(self):
        return self.name


class Doctor(models.Model):
    GENDER_MALE = 'male'
    GENDER_FEMALE = 'female'
    GENDER_CHOICES = [
        (GENDER_MALE, 'Male'),
        (GENDER_FEMALE, 'Female'),
    ]

    CONTACT_OFFICE = 'office'
    CONTACT_MOBILE = 'mobile'
    CONTACT_RESIDENCE = 'residence'
    DEFAULT_CONTACT_CHOICES = [
        (CONTACT_OFFICE, 'Office'),
        (CONTACT_MOBILE, 'Mobile'),
        (CONTACT_RESIDENCE, 'Residence'),
    ]

    ADDRESS_OFFICE = 'office'
    ADDRESS_RESIDENCE = 'residence'
    ADDRESS_TYPE_CHOICES = [
        (ADDRESS_OFFICE, 'Office'),
        (ADDRESS_RESIDENCE, 'Residence'),
    ]

    registration_number = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    short_name = models.CharField(max_length=50, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    date_of_birth = models.CharField(max_length=20, blank=True)
    specialization = models.CharField(max_length=200, blank=True)
    telephone_office = models.CharField(max_length=30, blank=True)
    telephone_residence = models.CharField(max_length=30, blank=True)
    mobile = models.CharField(max_length=20)
    default_contact = models.CharField(
        max_length=20, choices=DEFAULT_CONTACT_CHOICES, default=CONTACT_OFFICE, blank=True
    )
    email = models.EmailField()
    alternate_email = models.EmailField(blank=True)
    address_line1 = models.CharField(max_length=200)
    address_line2 = models.CharField(max_length=200, blank=True)
    address_line3 = models.CharField(max_length=200, blank=True)
    country = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    address_type = models.CharField(
        max_length=20, choices=ADDRESS_TYPE_CHOICES, default=ADDRESS_OFFICE, blank=True
    )
    is_default_address = models.BooleanField(default=False)
    affiliation = models.CharField(max_length=200, blank=True)
    sales_reference = models.CharField(max_length=200, blank=True)
    commission_applicable = models.BooleanField(default=False)
    is_postpaid = models.BooleanField(default=False)
    invoice_payment_period_days = models.PositiveIntegerField(default=0)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    communication_language = models.CharField(max_length=100, blank=True)
    comment = models.TextField(blank=True)
    report_print_exception = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return self.short_name or self.full_name

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(part for part in parts if part).strip()


class LabConfiguration(models.Model):
    FREQ_DAILY = 'daily'
    FREQ_MONTHLY = 'monthly'
    FREQ_YEARLY = 'yearly'
    FREQ_CHOICES = [
        (FREQ_DAILY, 'Daily'),
        (FREQ_MONTHLY, 'Monthly'),
        (FREQ_YEARLY, 'Yearly'),
    ]

    sms_to_patient = models.BooleanField(default=False)
    sms_to_doctor = models.BooleanField(default=False)
    sms_to_lab = models.BooleanField(default=False)
    sms_to_lab_mobile = models.CharField(max_length=30, blank=True)
    sms_to_other = models.BooleanField(default=False)
    sms_to_other_mobile = models.CharField(max_length=30, blank=True)
    sms_to_pathologist_appointment = models.BooleanField(default=False)
    sms_to_pathologist_mobile = models.CharField(max_length=30, blank=True)
    sms_to_collection_center = models.BooleanField(default=False)
    sms_to_affiliation = models.BooleanField(default=False)

    email_to_patient = models.BooleanField(default=True)
    email_to_doctor = models.BooleanField(default=True)
    email_to_lab = models.BooleanField(default=True)
    email_to_lab_address = models.EmailField(blank=True)
    email_to_collection_center = models.BooleanField(default=True)
    email_to_affiliation = models.BooleanField(default=False)

    whatsapp_to_patient = models.BooleanField(default=True)
    whatsapp_to_doctor = models.BooleanField(default=False)
    whatsapp_to_affiliation = models.BooleanField(default=False)
    whatsapp_to_autorelease = models.BooleanField(default=False)

    lab_code_prefix = models.CharField(max_length=20, default='1')
    lab_code_start = models.CharField(max_length=20, default='69')
    lab_code_frequency = models.CharField(max_length=20, choices=FREQ_CHOICES, default=FREQ_DAILY)
    lab_code_auto_increment = models.BooleanField(default=True)

    report_show_header = models.BooleanField(default=True)
    report_show_footer = models.BooleanField(default=True)
    allow_print_without_approve = models.BooleanField(default=False)
    reprint_report_roles = models.CharField(max_length=200, default='Admin,Pathologis')
    test_auto_approval = models.BooleanField(default=False)
    auto_registration_transfer = models.BooleanField(default=False)

    mera_batuva_token_id = models.CharField(max_length=200, blank=True)
    mera_batuva_instance_id = models.CharField(max_length=200, blank=True)
    lab_qr_code = models.ImageField(upload_to='lab_qr/', blank=True, null=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Lab configuration'

    def __str__(self):
        return 'Lab Configuration'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ServiceAreaPincode(models.Model):
    pincode = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['pincode']
        verbose_name = 'Service area pincode'

    def __str__(self):
        return self.pincode


class LabActivity(models.Model):
    TYPE_DAILY = 'daily'
    TYPE_WEEKLY = 'weekly'
    TYPE_MONTHLY = 'monthly'
    TYPE_ONE_TIME = 'one_time'
    TYPE_CHOICES = [
        (TYPE_DAILY, 'Daily'),
        (TYPE_WEEKLY, 'Weekly'),
        (TYPE_MONTHLY, 'Monthly'),
        (TYPE_ONE_TIME, 'One Time'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    creation_date = models.CharField(max_length=20)
    activity_date = models.DateField(null=True, blank=True)
    activity_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_DAILY)
    eta = models.CharField(max_length=100, blank=True)
    remark = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activities'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-activity_date', '-created_at']
        verbose_name_plural = 'Lab activities'

    def __str__(self):
        return self.title

    @staticmethod
    def parse_creation_date(value):
        from datetime import datetime
        text = (value or '').strip()
        for fmt in ('%d/%m/%Y', '%d-%m-%Y'):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
        return None

    def save(self, *args, **kwargs):
        parsed = self.parse_creation_date(self.creation_date)
        if parsed:
            self.activity_date = parsed
        super().save(*args, **kwargs)


class JoinRequest(models.Model):
    """Public 'Come N Join With Clasmo' enquiries from the landing page."""

    TYPE_FRANCHISE = 'franchise'
    TYPE_JOB = 'job'
    REQUEST_TYPE_CHOICES = [
        (TYPE_FRANCHISE, 'Franchise'),
        (TYPE_JOB, 'Job Vacancy'),
    ]

    PARTNERSHIP_BRAND = 'brand'
    PARTNERSHIP_SELF = 'self'
    PARTNERSHIP_CHOICES = [
        (PARTNERSHIP_BRAND, 'Brand'),
        (PARTNERSHIP_SELF, 'Self'),
    ]

    EXPERIENCE_FRESHER = 'fresher'
    EXPERIENCE_EXPERIENCED = 'experienced'
    EXPERIENCE_CHOICES = [
        (EXPERIENCE_FRESHER, 'Fresher'),
        (EXPERIENCE_EXPERIENCED, 'Experienced'),
    ]

    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES, blank=True)
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    organization = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    message = models.TextField(blank=True)

    partnership_type = models.CharField(max_length=10, choices=PARTNERSHIP_CHOICES, blank=True)
    contact_person = models.CharField(max_length=150, blank=True)
    full_address = models.TextField(blank=True)
    pincode = models.CharField(max_length=12, blank=True)
    proof_of_address = models.CharField(max_length=200, blank=True)
    letterhead_photo = models.FileField(upload_to='join/franchise/', blank=True, null=True)
    lab_interior_photo = models.FileField(upload_to='join/franchise/', blank=True, null=True)

    branch = models.CharField(max_length=100, blank=True)
    experience_type = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES, blank=True)
    current_employer = models.CharField(max_length=200, blank=True)
    total_experience = models.CharField(max_length=50, blank=True)
    last_salary = models.CharField(max_length=50, blank=True)
    resume = models.FileField(upload_to='join/job/', blank=True, null=True)

    is_handled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Join request'

    def __str__(self):
        label = self.get_request_type_display() if self.request_type else 'Enquiry'
        return f'{label}: {self.name} ({self.phone or "-"})'


class SelfPatientQuery(models.Model):
    """Public patient query from Test Quorum with photo upload."""

    test_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to='patient-queries/')
    is_handled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Self patient query'
        verbose_name_plural = 'Self patient queries'

    def __str__(self):
        return f'{self.test_name} ({self.created_at:%d-%b-%Y})'

