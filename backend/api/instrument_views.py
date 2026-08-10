from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .clinical_permissions import IsTechnicianOrAdmin
from .instrument_service import (
    InstrumentIngestError,
    apply_instrument_results,
    build_patient_report_by_barcode,
)

class InstrumentResultsIngestView(APIView):
    """
    POST /api/instrument/results/

    Body:
      {
        "barcode": "SAMPLE-BC-1001",
        "instrument_id": "Sysmex-XN",   // optional
        "results": [
          {"code": "HGB", "value": "12.1"},
          {"code": "WBC", "value": "7.61"}
        ]
      }
    """

    permission_classes = [permissions.IsAuthenticated, IsTechnicianOrAdmin]

    def post(self, request):
        barcode = request.data.get('barcode', '')
        instrument_id = request.data.get('instrument_id', '') or ''
        results = request.data.get('results') or request.data.get('values') or []

        if not isinstance(results, list):
            return Response(
                {'detail': 'results must be a list of {code, value} objects.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = apply_instrument_results(
                barcode=barcode,
                results=results,
                instrument_id=instrument_id,
                user=request.user,
                raw_payload=dict(request.data),
            )
        except InstrumentIngestError as exc:
            return Response(
                {'ok': False, 'detail': exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(payload, status=status.HTTP_200_OK)


class PatientReportByBarcodeView(APIView):
    """
    GET /api/instrument/patient-report/?barcode=...
    Returns patient demographics + CBC rows (with machine/manual results when present).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        barcode = request.query_params.get('barcode', '')
        test_filter = request.query_params.get('test', 'cbc')
        data = build_patient_report_by_barcode(
            barcode, test_filter=test_filter, user=request.user
        )
        if not data.get('found'):
            return Response(data, status=status.HTTP_404_NOT_FOUND)
        return Response(data)
