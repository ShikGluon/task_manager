using FluentValidation;

namespace TaskManager.Api.Features.Auth;

/// <summary>
/// Validates <see cref="RegisterRequest"/> before the registration endpoint processes it.
/// </summary>
public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    /// <summary>Initialises validation rules for registration.</summary>
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8)
            .WithMessage("Password must be at least 8 characters");
    }
}

/// <summary>
/// Validates <see cref="LoginRequest"/> before the login endpoint processes it.
/// </summary>
public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    /// <summary>Initialises validation rules for login.</summary>
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}
